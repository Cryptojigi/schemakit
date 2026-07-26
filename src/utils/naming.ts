export function toSnakeCase(str: string): string {
  return str
    .replace(/\W+/g, " ")
    .split(/ |\B(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join("_");
}

export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

export function toPascalCase(str: string): string {
  return str
    .replace(/\w\S*/g, (m) => m.charAt(0).toUpperCase() + m.substr(1).toLowerCase())
    .replace(/\s+/g, "");
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

// Basic pluralization/singularization for generic code gen
export function pluralize(str: string): string {
  if (str.endsWith("y")) return str.slice(0, -1) + "ies";
  if (str.endsWith("s") || str.endsWith("sh") || str.endsWith("ch") || str.endsWith("x") || str.endsWith("z")) {
    return str + "es";
  }
  return str + "s";
}

export function singularize(str: string): string {
  if (str.endsWith("ies")) return str.slice(0, -3) + "y";
  if (str.endsWith("es")) return str.slice(0, -2);
  if (str.endsWith("s")) return str.slice(0, -1);
  return str;
}
