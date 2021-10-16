import { MODULE_NAME } from './settings';

export const preloadTemplates = async function () {
	// const MODULE_NAME = 'itemcollection';
	const templatePaths = [
		// Add paths to "module/XXX/templates"
		`modules/${MODULE_NAME}/templates/bag-sheet.html`,
		`modules/${MODULE_NAME}/templates/bag-description.html`,
    `modules/${MODULE_NAME}/templates/shop-sheet.html`
  ];
  

	return loadTemplates(templatePaths);
}
