import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TMP = path.join(ROOT, '.tmp');

const FILES = [
  'component-definition.json',
  'component-models.json',
  'component-filters.json',
];

function readJson(name, source) {
  return JSON.parse(fs.readFileSync(path.join(TMP, `${source}-${name}`), 'utf8'));
}

function writeJson(name, data) {
  fs.writeFileSync(
    path.join(ROOT, name),
    `${JSON.stringify(data, null, 2)}\n`,
  );
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function mergeDefinitions(xwalk, da) {
  const daComponents = new Map();
  da.groups.forEach((group) => {
    group.components.forEach((component) => {
      daComponents.set(component.id, component);
    });
  });

  const mergedGroups = xwalk.groups.map((group) => ({
    ...group,
    components: group.components.map((component) => {
      const daComponent = daComponents.get(component.id);
      if (!daComponent) return component;
      daComponents.delete(component.id);
      return {
        ...component,
        ...(daComponent.model ? { model: daComponent.model } : {}),
        ...(daComponent.filter ? { filter: daComponent.filter } : {}),
        plugins: {
          ...component.plugins,
          ...daComponent.plugins,
        },
      };
    }),
  }));

  if (daComponents.size > 0) {
    da.groups.forEach((group) => {
      const extraComponents = group.components.filter((component) => daComponents.has(component.id));
      if (!extraComponents.length) return;

      let targetGroup = mergedGroups.find((entry) => entry.id === group.id);
      if (!targetGroup) {
        targetGroup = { ...group, components: [] };
        mergedGroups.push(targetGroup);
      }

      extraComponents.forEach((component) => {
        targetGroup.components.push(component);
        daComponents.delete(component.id);
      });
    });
  }

  return { groups: mergedGroups };
}

function mergeModels(xwalk, da) {
  const daModels = indexById(da);
  const merged = xwalk.map((model) => {
    const daModel = daModels.get(model.id);
    if (!daModel) return model;
    daModels.delete(model.id);
    const daFieldCount = daModel.fields?.length ?? 0;
    const xwalkFieldCount = model.fields?.length ?? 0;
    return daFieldCount >= xwalkFieldCount ? daModel : model;
  });

  daModels.forEach((model) => merged.push(model));
  return merged;
}

function mergeFilters(xwalk, da) {
  const daFilters = indexById(da);
  const merged = xwalk.map((filter) => {
    const daFilter = daFilters.get(filter.id);
    if (!daFilter) return filter;
    daFilters.delete(filter.id);
    return {
      ...filter,
      components: [...new Set([
        ...(filter.components || []),
        ...(daFilter.components || []),
      ])],
    };
  });

  daFilters.forEach((filter) => merged.push(filter));
  return merged;
}

FILES.forEach((file) => {
  const xwalk = readJson(file, 'xwalk');
  const da = readJson(file, 'da');

  if (file === 'component-definition.json') {
    writeJson(file, mergeDefinitions(xwalk, da));
    return;
  }

  if (file === 'component-models.json') {
    writeJson(file, mergeModels(xwalk, da));
    return;
  }

  writeJson(file, mergeFilters(xwalk, da));
});
