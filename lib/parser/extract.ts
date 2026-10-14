import { Node, SyntaxKind, type ImportClause, type SourceFile } from "ts-morph";
import type { EdgeKind } from "./types.ts";

export type RawImport = {
  kind: EdgeKind;
  line: number;
  typeOnly: boolean;
} & (
  | { literal: true; specifier: string }
  // import(someVariable), require(someVariable): seen and reported, but there is no path to resolve.
  | { literal: false; expression: string }
);

export function extractImports(sourceFile: SourceFile): RawImport[] {
  const found: RawImport[] = [];

  // Static imports and re-exports are only legal at the top level of a module.
  for (const statement of sourceFile.getStatements()) {
    if (Node.isImportDeclaration(statement)) {
      const clause = statement.getImportClause();
      found.push({
        kind: "import",
        literal: true,
        specifier: statement.getModuleSpecifierValue(),
        line: statement.getStartLineNumber(),
        typeOnly: clause ? isTypeOnlyClause(clause) : false,
      });
    } else if (Node.isExportDeclaration(statement)) {
      const specifier = statement.getModuleSpecifierValue();
      if (specifier === undefined) continue; // `export { a }` names a local, not a file
      found.push({
        kind: "re-export",
        literal: true,
        specifier,
        line: statement.getStartLineNumber(),
        typeOnly: statement.isTypeOnly() || allTypeOnly(statement.getNamedExports()),
      });
    } else if (Node.isImportEqualsDeclaration(statement)) {
      // `import x = require("y")` is TypeScript import syntax, not a require() call.
      const reference = statement.getModuleReference();
      if (Node.isExternalModuleReference(reference)) {
        const expression = reference.getExpression();
        if (expression && Node.isStringLiteral(expression)) {
          found.push({
            kind: "import",
            literal: true,
            specifier: expression.getLiteralValue(),
            line: statement.getStartLineNumber(),
            typeOnly: statement.isTypeOnly(),
          });
        }
      }
    }
  }

  // import() and require() can appear anywhere an expression can. The
  // `require` inside `import x = require("y")` above is not a call expression,
  // so nothing here sees it a second time.
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression();
    const kind: EdgeKind | null =
      callee.getKind() === SyntaxKind.ImportKeyword
        ? "dynamic-import"
        : Node.isIdentifier(callee) && callee.getText() === "require"
          ? "require"
          : null;
    if (kind === null) continue;
    const [argument] = call.getArguments();
    const line = call.getStartLineNumber();
    if (argument && (Node.isStringLiteral(argument) || Node.isNoSubstitutionTemplateLiteral(argument))) {
      found.push({ kind, literal: true, specifier: argument.getLiteralValue(), line, typeOnly: false });
    } else {
      found.push({ kind, literal: false, expression: argument ? argument.getText() : "", line, typeOnly: false });
    }
  }

  return found;
}

/** What `module.exports = <value>` is called when the value's own names can't all be read. */
export const WHOLE_MODULE = "module.exports";

/**
 * The names a file exports, read from its own syntax: ESM export statements at
 * the top level, and CommonJS assignments to module.exports or exports
 * wherever they appear. Source order, each name once.
 */
export function extractExports(sourceFile: SourceFile): string[] {
  const found: { name: string; at: number }[] = [];
  const add = (name: string, at: Node) => found.push({ name, at: at.getStart() });

  for (const statement of sourceFile.getStatements()) {
    if (Node.isExportDeclaration(statement)) {
      // `export * from` names nothing here; `export * as ns from` names ns.
      const namespace = statement.getNamespaceExport();
      if (namespace) add(namespace.getName(), statement);
      for (const specifier of statement.getNamedExports()) {
        add(specifier.getAliasNode()?.getText() ?? specifier.getName(), specifier);
      }
    } else if (Node.isExportAssignment(statement)) {
      // `export = x` is TypeScript's spelling of module.exports = x.
      if (statement.isExportEquals()) addWholeModule(statement.getExpression(), add);
      else add("default", statement);
    } else if (Node.isVariableStatement(statement)) {
      if (!statement.hasExportKeyword()) continue;
      for (const declaration of statement.getDeclarations()) {
        const name = declaration.getNameNode();
        if (Node.isIdentifier(name)) add(name.getText(), name);
        // `export const { a, b: c } = x` exports a and c.
        else for (const element of name.getDescendantsOfKind(SyntaxKind.BindingElement)) {
          const bound = element.getNameNode();
          if (Node.isIdentifier(bound)) add(bound.getText(), bound);
        }
      }
    } else if (
      Node.isFunctionDeclaration(statement) ||
      Node.isClassDeclaration(statement) ||
      Node.isInterfaceDeclaration(statement) ||
      Node.isTypeAliasDeclaration(statement) ||
      Node.isEnumDeclaration(statement) ||
      Node.isModuleDeclaration(statement) ||
      Node.isImportEqualsDeclaration(statement)
    ) {
      if (!statement.hasExportKeyword()) continue;
      if (statement.hasDefaultKeyword()) {
        add("default", statement);
        continue;
      }
      const name = statement.getNameNode();
      // `declare module "x"` is named by a string and exports nothing from this file.
      if (name && Node.isIdentifier(name)) add(name.getText(), name);
    }
  }

  for (const assignment of sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
    if (assignment.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) continue;
    const target = assignment.getLeft();
    if (isModuleExports(target)) {
      addWholeModule(assignment.getRight(), add);
      continue;
    }
    // module.exports.name = …, exports.name = …, and the ["name"] forms.
    if (Node.isPropertyAccessExpression(target) || Node.isElementAccessExpression(target)) {
      const object = target.getExpression();
      if (!isModuleExports(object) && !(Node.isIdentifier(object) && object.getText() === "exports")) continue;
      const name = Node.isPropertyAccessExpression(target) ? target.getName() : literalText(target.getArgumentExpression());
      if (name !== null) add(name, target);
    }
  }

  // Object.defineProperty(exports, "name", …) is how compiled CommonJS writes
  // them. "__esModule" is the compiler's own marker, not something exported.
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getText() !== "Object.defineProperty") continue;
    const [object, key] = call.getArguments();
    if (!object || !(isModuleExports(object) || object.getText() === "exports")) continue;
    const name = literalText(key);
    if (name !== null && name !== "__esModule") add(name, call);
  }

  found.sort((a, b) => a.at - b.at);
  return [...new Set(found.map((f) => f.name))];
}

// `module.exports = { a, b }` exports a and b. Anything else, including an
// object with a spread or a computed key, is one value whose names aren't all
// written here, so it's recorded as that value rather than as a partial list.
function addWholeModule(value: Node, add: (name: string, at: Node) => void): void {
  if (Node.isObjectLiteralExpression(value)) {
    const names: { name: string; at: Node }[] = [];
    for (const property of value.getProperties()) {
      if (Node.isSpreadAssignment(property)) return add(WHOLE_MODULE, value);
      const nameNode = property.getNameNode();
      const name = Node.isIdentifier(nameNode) ? nameNode.getText() : literalText(nameNode);
      if (name === null) return add(WHOLE_MODULE, value);
      names.push({ name, at: property });
    }
    for (const n of names) add(n.name, n.at);
    return;
  }
  add(WHOLE_MODULE, value);
}

function isModuleExports(node: Node): boolean {
  return (
    Node.isPropertyAccessExpression(node) &&
    node.getName() === "exports" &&
    Node.isIdentifier(node.getExpression()) &&
    node.getExpression().getText() === "module"
  );
}

function literalText(node: Node | undefined): string | null {
  if (node && (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node))) return node.getLiteralValue();
  return null;
}

function isTypeOnlyClause(clause: ImportClause): boolean {
  if (clause.isTypeOnly()) return true;
  // `import { type A, type B } from` erases entirely; one value binding keeps it.
  if (clause.getDefaultImport() || clause.getNamespaceImport()) return false;
  return allTypeOnly(clause.getNamedImports());
}

function allTypeOnly(specifiers: { isTypeOnly(): boolean }[]): boolean {
  return specifiers.length > 0 && specifiers.every((specifier) => specifier.isTypeOnly());
}
