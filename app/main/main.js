/**
 * Application initialization
 */
Hooks.once("init", () => {   

  console.log("Setting known Sheets");
  loadTemplates([
    ItemCollectionTemplate.path().itemSideBarTemplate,
    ItemCollectionTemplate.path().itemDetailsTemplate
  ]);
  ItemCollection.setup(ItemCollectionTemplate);
});

Hooks.once("ready", () => {

});
