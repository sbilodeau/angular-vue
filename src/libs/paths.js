export default {
  parent,
  parents,
  leaf,
  root,
  isRoot,
};

function parent(path) {
  const parts = split(path);

  parts.pop();

  return combine(parts);
}

function parents(path) {
  const parentPaths = [];

  let parentPath = parent(path);

  while (parentPath) {
    parentPaths.push(parentPath);
    parentPath = parent(parentPath);
  }

  return parentPaths;
}

function leaf(path) {
  const parts = split(path);
  return parts.pop();
}

function root(path) {
  return split(path)[0];
}

function isRoot(path) {
  return split(path).length === 1;
}

function split(path) {
  if (!path) throw new Error(`Invalid path ${path}`);

  return path.split('.');
}

function combine(parts) {
  return parts.join('.');
}
