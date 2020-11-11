import { DND5E } from "/systems/dnd5e/module/config.js";
import Item5e from "/systems/dnd5e/module/item/entity.js";
import ItemSheet5e from "/systems/dnd5e/module/item/sheet.js";

let knownSheets = {};
let templates = {};
let canAlwaysAddToBag = [];
let canAlwaysAddToBagTypes = [];
Hooks.once("ready", () => {
  canAlwaysAddToBag = game.i18n.localize("itemcollection.canAlwaysAddToBag");
  canAlwaysAddToBagTypes = game.i18n.localize("itemcollection.canAlwaysAddToBagTypes");
});

export class ItemSheet5eWithBags extends ItemSheet5e {
  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      width: 570,
      height: 500,
      showUnpreparedSpells: true
    });
    return options;
  }

  get template() {
    return  "modules/itemcollection/templates/bag-sheet.html";
  }


  /*
  render(...args) {
    super.render(...args);
  }
*/
  async _onSubmit(event, {updateData=null, preventClose=false}={}) {
    if (this.item.type !== "backpack") updateData = expandObject({"flags.-=itemcollection": null});
      super._onSubmit(event, {"updateData": updateData, "preventClose": preventClose})
  }

  async getData() {
    const type = this.item.data.type;

    if (!["backpack"].includes(type)) {
      ui.notifications.error(game.i18n.localize("itemcollection.wrongType"))
      this.options.editable = false;
      return super.getData();
    };
  
    this._sheetTab="details"

    const item = this.item;
    var data = await super.getData();
    data.flags = item.data.flags;

    if (!hasProperty(data.flags, "itemcollection.itemWeight"))
      setProperty(data.flags, "itemcollection.itemWeight", 0);
    if (!hasProperty(data.flags, "itemcollection.fixedWeight"))
      setProperty(data.flags,"itemcollection.fixedWeight", 0);
    if (!hasProperty(data.flags, "itemcollection.goldValue"))
      setProperty(data.flags,"itemcollection.goldValue",  0);
    if (!hasProperty(data.flags, "itemcollection.contents"))
      setProperty(data.flags,"itemcollection.contents", []);
    if (!hasProperty(data.flags, "itemcollection.importSpells"))
      setProperty(data.flags,"itemcollection.importSpells", false);
    
    for (let i = 0; i < data.flags.itemcollection.contents.length; i++) {
      if (data.flags.itemcollection.contents[i].id) {
        data.flags.itemcollection.contents[i]._id = data.flags.itemcollection.contents[i].id;
        delete data.flags.itemcollection.contents[i].id;
      }
    }

    this.options.editable = this.options.editable// && (!this.item.actor || !this.item.actor.token);
    data.hasDetails = true;
    if (game.settings.get("itemcollection", "sortBagContents")) {
      data.flags.itemcollection.contents.sort((a,b) => {
        if (a.type !== b.type) return (a.type < b.type ? -1 : 1);
        if (a.type !== "spell") return (a.name < b.name ? -1 : 1);
        if (a.data.level !== b.data.level) return (a.data.level - b.data.level);
        return a.name < b.name ? -1 : 1;
      });
    }
//      data.flags = duplicate(this.item.data.flags);
    await this.updateWeight();
    data.isGM = game.user.isGM;
    data.isOwned = !!this.item.actor;
    data.isEquipped = data.data.equipped;
    data.canConvertToGold = game.settings.get('itemcollection', 'goldConversion');
    data.data.owned = !!this.item.actor;
    data.allowBulkOperations = this.item.actor && !this.item.actor.isToken;
    data.canEdit = this.options.editable;
    data.canImportExport = data.isOwned && !this.item.actor.isToken;

    let totalGoldValue = this.calcBagGoldValue();
    //TODO check this out
    for (let i of data.flags.itemcollection.contents){
      // i.selected = false;
      // i.owned = !!this.item.actor;
      i.totalWeight = this._calcItemWeight(i);
      i.isBackpack = i.type === "backpack"
    }
    data.flags.itemcollection.goldValue = totalGoldValue;
    data.data.weight = this.calcBagWeight();
    data.flags.itemcollection.itemWeight = this.calcContentsWeight();
    return data;
  }

  _calcItemWeight(itemData) {
    let quantity = itemData.data.quantity || 1;
    let weight = itemData.data.weight || 0;
    return Math.round(weight * quantity * 100) / 100;
  }

  _calcItemPrice(itemData) {
    let quantity = (itemData.data.quantity) || 1;
    let price = (itemData.data.price) || 0;
    if (typeof price === "string") { // try to remove GP from the string
      price= price.replace(/[^\d]+/g, "");;
      price = Number(price);
    }
    return price * quantity;
  }

  _getWeightChangeString() {
  }

  async updateWeight() {
    let oldWeight = this.item.data.data.weight;
    let oldItemWeight = this.item.getFlag("itemcollection", "itemWeight");
    let totalWeight = this.calcBagWeight();
    let itemWeight = this.calcContentsWeight();
    // this.item.data.flags.itemcollection.itemWeight = bagWeight;
    if (oldWeight !== totalWeight || itemWeight !== oldItemWeight) { 
      if (this.item.actor) {
        //this.item.data.data.weight = totalWeight;
        // this.item.data.flags.itemcollection.itemWeight = itemWeight;
        await this.item.actor.updateOwnedItem({"_id": this.item._id, "data.weight": totalWeight, "flags.itemcollection.itemWeight": itemWeight});
      } else {
        await this.item.update({"data.weight": totalWeight, "flags.itemcollection.itemWeight": itemWeight});
      }
    }
  }

  async updateEmbeddedEntity(collection, data, options) {
    return this.updateOwnedItem(data, options)
  }

  async updateOwnedItem(itemChanges, options) {
    this.item.updateOwneditem(itemChanges, options);
  }

  calcBagGoldValue() {
    let totalItemValue = (this.item.getFlag("itemcollection", "contents")|| []).reduce((val, item) => val += this._calcItemPrice(item), 0)
    const currency = this.item.data.data.currency;
    let coinValue =currency ?  Object.keys(currency).reduce((val, denom) =>
                         val += {"pp" :10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01}[denom] * currency[denom], 0) : 0;
    return Math.round(totalItemValue + coinValue);
  }

  calcContentsWeightInternal() {
    let weight = (this.item.getFlag("itemcollection", "contents") || []).reduce((val, itemData) => {
      if (canAlwaysAddToBagTypes.some(name=>itemData.name.includes(name))) return val;
      if (canAlwaysAddToBag.includes(itemData.name)) return val;
      val += this._calcItemWeight(itemData)
      return val
    }, 0);
    // Add Currency Weight
    if ( game.settings.get("dnd5e", "currencyWeight") ) {
      const currency = this.item.data.data.currency;
      const numCoins = currency ? Object.values(currency).reduce((val, denom) => val += denom, 0) : 0;
      weight = Math.round((weight + (numCoins / 50)) * 10) / 10;
    }
    return weight;
  }
  
  calcContentsWeight () {
    let weight = (this.item.getFlag("itemcollection", "contents") || []).reduce((val, itemData) => val += this._calcItemWeight(itemData), 0);
    // Add Currency Weight
    if ( game.settings.get("dnd5e", "currencyWeight") ) {
      const currency = this.item.data.data.currency;
      const numCoins = currency ? Object.values(currency).reduce((val, denom) => val += denom, 0) : 0;
      weight = Math.round((weight + (numCoins / 50)) * 10) / 10;
    }
    return weight;
  }

  calcBagWeight() {
    const equipped = this.item.data.data.equipped;
    const isFixed = this.item.data.data.capacity.weightless;
    return !equipped ? 0 : this.item.getFlag("itemcollection", "fixedWeight") + (isFixed ? 0 : this.calcContentsWeight())
  }

  calcBagWeight() {
    const equipped = this.item.data.data.equipped;
    const isFixed = this.item.data.data.capacity.weightless;
    return !equipped ? 0 : this.item.getFlag("itemcollection", "fixedWeight") + (isFixed ? 0 : this.calcContentsWeight())
  }

  async _onDragItemStart(event) {
    event.stopPropagation();
    const items = this.item.getFlag("itemcollection", "contents");
    const itemId = Number(event.currentTarget.dataset.itemId);
    let item = items.find(i => i._id === itemId);
    item = duplicate(item);
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      data: item
    }));
    await this.deleteOwnedItem(itemId);
    //this.render(false);
  }

  async deleteAllOwnedItems() { // does not push updates
    if (this.item.isOwned) {
      this.item.updateParent([]);
    } else await this.item.setFlag("itemcollection", "contents", []);
    this.item.prepareData();
    this.render(false);
  }

  async deleteOwnedItem(deleted) {
    await this.item.deleteOwnedItem(deleted);
    // await this.updateWeight();
    this.item.prepareData();
    this.render(false);
  }

  async _addManyBagItems(items) {
    let contents = this.item.data.flags.itemcollection.contents;

    let newItemId = contents.length ? Math.max(...contents.map(i => i._id)) + 1 : 1;
    items.forEach(i=>this.createOwnedItem(item))
  }

  async createEmbeddedEntity(collection, data, options) {
    return this.createOwnedItem(data, options)
  }

  async createOwnedItem(itemData, options = {}) {
    await this.item.createOwnedItem(itemData, options);
    await this.updateWeight();
    this.render(false);
    return true;
  }

  canAdd(itemData) {
    // Check that the item is not too heavy for the bag.
    let bagCapacity = this.item.data.data.capacity.value;
    if (bagCapacity === 0) return true;
    if (canAlwaysAddToBagTypes.some(name=>itemData.name.includes(name))) return true;
    if (canAlwaysAddToBag.includes(itemData.name)) return true;
    if (this.item.data.data.capacity.type === "items") {
      let itemCount = 0 | this.item.data.flags.itemcollection.contents.reduce((val, itemData) => val + (itemData.data.quantity || 1), 0);
      let itemQuantity = itemData.data.quantity || 1;
      return itemCount + itemQuantity <= bagCapacity;
    }
    let newWeight = this._calcItemWeight(itemData);
    let contentsWeight = this.calcContentsWeightInternal();
    // let contentsWeight = Number(this.item.getFlag("itemcollection", "itemWeight"));
    return bagCapacity >= contentsWeight + newWeight;
  }

  async _onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ( data.type !== "Item" ) {
        console.log("ItemCollection | Bags only accept items");
        return false;
      }
    }
    catch (err) {
      console.log("ItemCollection | drop error")
      console.log(event.dataTransfer.getData('text/plain'));
      console.log(err);
      return false;
    }
    // Case 1 - Data explicitly provided
    if ( data.data ) {
      if ((this.item.isOwned && data.actorId === this.item.actor._id) && data.data._id === this.item.data._id) {
        console.log("ItemCollection | Cant drop on yourself");
        ui.notifications.info(game.i18n.localize('itemcollection.ExtradimensionalVortex'));
        throw new Error("Dragging bag onto istelf opens a planar vortex and you are sucked into it")
      }
      // We do't have the source actor. Only allow the drop from the same actor. *** TO DO ****
      // drop from player characters or another bag.
      let actor = (data.actorId) ? game.actors.get(data.actorId) : undefined;
      if (this.canAdd(data.data)) {
          // will fit in the bag so add it to the bag and delete from the owning actor if there is one.
          let toDelete = data.data._id;
          await this.createOwnedItem(data.data);
          if (actor && actor.data.type === "character") await actor.deleteOwnedItem(toDelete);
          this.render(false);
          return false;
      }
      // Item will not fit in the bag what to do?
      if (this.item.actor) { // this bag is owned by an actor - drop into the inventory instead.
          // let myActor = game.actors.get(this.item.actor.data._id);
          if (actor && actor.data.type === "character") await actor.deleteOwnedItem(data.data._id);
          await this.item.actor.createOwnedItem(data.data, {});
          ui.notifications.info(game.i18n.localize('itemcollection.AlternateDropInInventory'));
          this.render(false);
          return false;
      }

      // Last resort accept the drop anyway so that the item wont disappear.
      if (!actor) await this.createOwnedItem(data.data, data.id); 
    }

    // Case 2 - Import from a Compendium pack
    else if ( data.pack ) {
      this._importItemFromCollection(data.pack, data.id);
    }

    // Case 3 - Import from World entity
    else {
      let item = game.items.get(data.id);
      if (this.canAdd(item.data)) { // item will fit in the bag

        await this.createOwnedItem(duplicate(item.data), {});
      } else {
        console.log(`ItemCollection | no room in bag for dropped item`);
        ui.notifications.info(game.i18n.localize('itemcollection.NoRoomInBag'));
      }
    }
    return false;
  }

  async _importItemFromCollection(collection, entryId) {
    const pack = game.packs.find(p => p.collection === collection);
    if ( pack.metadata.entity !== "Item" && pack.metadata.entity !== "Spell") return;
    return pack.getEntity(entryId).then(ent => {
      // delete ent.data._id;
      if (this.canAdd(ent.data)) {
        console.log(`ItemCollection | Importing Item ${ent.name} from ${collection}`);
        this.createOwnedItem(duplicate(ent.data), {});
      } else {
        console.log(`ItemCollection | no room in bag for dropped item`);
        ui.notifications.info(game.i18n.localize('itemcollection.NoRoomInBag'));
      }
    });
  }


  async _itemExport(event) {
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = this.item.getFlag("itemcollection", "contents");
    let idx = items.findIndex(o => o._id === id);
    if (idx === -1) {
      throw new Error(`OwnedItem ${id} not found in Bag ${this.item.data._id}`);
    }

    if (this.item.actor && items[idx].type !== "backpack" ) { // not a bag
      // seem to need to wait in case they press delete too fast 
      // and the next one comes through before the previous has finsihed which buggers up the item numbers
      await this.deleteOwnedItem(id);
      await this.item.actor.createOwnedItem(duplicate(items[idx]), {}) ;
      this.render(false);
      return;
    } else if (items[idx].flags.itemcollection) {
      items = duplicate(items);
      // is a bag do an import of everything in the bag
      // not an owned item, if it is a bag import all items from the selected bag if there are any.
      for (let itemData of items[idx].flags.itemcollection.contents) {
        itemData._id = items.length ? Math.max(...items.map(iData => iData._id)) + 1 : 1;
        items.push(itemData);
      }
      // add the currency from the bag
      let itemCurrency = items[idx].data.currency;
      let bagCurrency = duplicate(this.item.data.data.currency);
      for (let denom of ["pp", "gp", "ep", "sp", "cp"]) {
        bagCurrency[denom] += Number(itemCurrency[denom] || 0);
        itemCurrency[denom] = 0;
      }
      items[idx].flags.itemcollection.contents = [];
      // TODO recalc bag weight
      items[idx].data.weight = 0;
      items[idx].flags.itemcollection.itemWeight = 0;
      if (this.item.actor) {
//        this.item.data.flags.itemcollection.contents = items;
//        this.item.data.data.currency = bagCurrency;
        await this.item.actor.updateOwnedItem({"_id": this.item._id, "flags.itemcollection.contents": items, "data.currency": bagCurrency});

        // await this.item.actor.updateOwnedItem(this.item.data);
      } else await this.item.update({"flags.itemcollection.contents": items, "data.currency": bagCurrency});
//      await this.item.setFlag("itemcollection", "contents", duplicate(items));
//      await this.item.update({"data.currency": bagCurrency});
      await this.updateWeight();
      this.render(false);
    }
  }

  async _itemSplit(event) {
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = duplicate(this.item.data.flags.itemcollection.contents);
    let idx = items.findIndex(o => o._id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.item.data._id}`);
    let newId = items.length ? Math.max(...items.map(i => i._id)) + 1 : 1;
    if (items[idx].flags.itemcollection) return; // cant split a bag
    if (!items[idx].data.quantity || items[idx].data.quantity < 2) return;
    let itemData = items[idx];
    let newQuantity = Math.floor(itemData.data.quantity / 2);
    items[idx].data.quantity -= newQuantity;
    let newItemData = duplicate(itemData);
    newItemData.data.quantity = newQuantity;
    newItemData._id = newId;
    items.push(newItemData)
    // this.item.data.flags.itemcollection.contents = items;
    if (this.item.actor) {
      this.item.updateParent(items);
    } else {
      await this.item.update({"flags.itemcollection.contents": items});
    }
    this.render(false);
  }

  async _itemConvertToGold(event) {
    if (!game.settings.get('itemcollection', 'goldConversion')) return;
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let items = this.item.getFlag("itemcollection", "contents");
    let idx = items.findIndex(o => o._id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.item._id}`);
    let itemData = items[idx];
    if (itemData.flags.itemcollection) return; // cant sell a bag
    let goldValue = this._calcItemPrice(itemData);
    if (goldValue <= 0) return;
    // remove the item
    await this.deleteOwnedItem(id);

    // add the gold
    let currency = duplicate(this.item.data.data.currency);
    currency.gp += Math.round(goldValue * game.settings.get('itemcollection', 'goldConversionPercentage') / 100);


    if (this.item.isOwned) {
      await this.item.actor.updateOwnedItem({"_id": this.item._id, "data.currency": currency})
    } await this.item.update({"data.currency": currency});
    this.item.data.data.currency.gp = currency.gp;
    this.item.prepareData();
    this.render(false);
  }

  async _compactAll() {
    let items = duplicate(this.item.data.flags.itemcollection.contents);
    let mergedItems = {};
    let keptItems = [];
    for (const itemData of items) {
      if (!itemData.flags.itemcollection) {
        var canMerge = false;
        if (mergedItems[itemData.name]) {
          let diffs = Object.keys(diffObject(mergedItems[itemData.name].data, itemData.data));
          canMerge = (diffs.length === 0) || (diffs.length === 1 && diffs[0] === "quantity")
        };
        if (mergedItems[itemData.name] && canMerge) {
          let oldQ = parseInt(mergedItems[itemData.name].data.quantity);
          let increment = parseInt(itemData.data.quantity || 1);
          if (mergedItems[itemData.name].data.quantity) mergedItems[itemData.name].data.quantity = oldQ + increment;
        } else if (mergedItems[itemData.name]) { // we would like to merge but can't
          keptItems.push(itemData);
        } else {
          mergedItems[itemData.name] = itemData;
        }
      } else keptItems.push(itemData);
    }
    items = Object.values(mergedItems).concat(keptItems);
    if (this.item.actor) {
      this.item.updateParent(items)
    } else {
      await this.item.update({"flags.itemcollection.contents": items});
    }
    await this.updateWeight();
    this.render(false);
  }

  async _exportAll(event) {
    if (!this.item.isOwned) return;
    // if (!this.item.actor.data._id) return;
      
    let contents = this.item.data.flags.itemcollection.contents;
    console.log(`ItemCollection | exporting ${contents.length} items to actor ${this.item.actor.data._id}`)
    for (let itemData of contents) {
      await this.item.actor.createOwnedItem(itemData, {});
    }

    // move the gold from the bag into the actor.
    let currency = duplicate(this.item.actor.data.data.currency);
    let newBagCurrency = duplicate(currency);
    ["pp", "gp", "ep", "sp", "cp"].forEach((denom) => {
      currency[denom] += this.item.data.data.currency[denom];
      newBagCurrency[denom] = 0;
    });

    await this.item.actor.update({"data.currency": currency});
    await this.item.actor.updateOwnedItem(
      {"_id": this.item._id, "flags.itemcollection.contents" : [], 
      "flags.itemcollection.goldValue": 0, "data.currency": newBagCurrency, "data.currency": newBagCurrency});
    this.item.data.flags.itemcollection.contents = [];
    this.item.data.flags.itemcollection.goldValue = 0;
    this.item.data.data.currency = newBagCurrency;
    this.item.prepareEmbeddedEntities();
    this.item.prepareData();
    await this.updateWeight();
    this.render(false);
  }
  
  update(data,options) {
    this.item.update(data, options)
  }
  

  async _editItem(ev) {
    let li = $(event.currentTarget).parents(".item");
    let id = Number(li.attr("data-item-id"));
    let item = this.item.items.find(o => o._id == id);
    if (!item) throw new Error(`Item ${id} not found in Bag ${this.item._id}`);
    // let item = this.items[idx];
    setProperty(this, "data.data.currency", this.item.data.data.currency);
    item.sheet.render(true);
    return;
    /*
    let items = this.item.getFlag("itemcollection", "contents");
    let idx = items.findIndex(o => o._id === id);
    if (idx === -1) throw new Error(`Item ${id} not found in Bag ${this.item._id}`);
    
    let item = await new Item5e(items[idx], {actor: this.item});
    setProperty(this, "data.data.currency", this.item.data.data.currency);
    item.sheet.render(true);
    return;
    */
  }

  _onItemSummary(event) {
    return;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below is only needed if the sheet is editable
    if ( !this.options.editable ) return;
    // Make the Actor sheet droppable for Items if it is not owned by a token or npc
    if (this.item.type === "backpack" /*|| this.item.type === "loot"*/) {
        this.form.ondragover = ev => this._onDragOver(ev);
        this.form.ondrop = ev => this._onDrop(ev);

        html.find('.item').each((i, li) => {
          li.setAttribute("draggable", true);
          li.addEventListener("dragstart", this._onDragItemStart.bind(this), false);
        });

        document.addEventListener("dragend", this._onDragEnd.bind(this));
        // html[0].ondragend = this._onDragEnd.bind(this);

    }

    html.find("input").focusout(this._onUnfocus.bind(this));

      // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      let li = $(ev.currentTarget).parents(".item"),
      itemId = Number(li.attr("data-item-id"));
      this.deleteOwnedItem(itemId);
    });

    html.find('.item-edit').click(ev => this._editItem(ev));
    html.find('.item-export-all').click(ev => this._exportAll());
    html.find('.item-export').click(ev => this._itemExport(ev));
    html.find('.item-compact-all').click(ev => this._compactAll(event));
//    html.find('.item-import-all').click(ev => this._importAllItemsFromActor());
    html.find('.item-split').click(ev => this._itemSplit(ev));
    html.find('.item-convertToGold').click(ev => this._itemConvertToGold(ev));
    html.find('.item .item-name h4').click(event => this._onItemSummary(event));
  //  html.find('.bag-equipped').click(ev => this._toggleEquipped(ev));
  }

  _onDragEnd(event) {

    event.preventDefault();
    return false;
  }
  _onDragOver(event) {
    event.preventDefault();
    return false;
  }

  _onUnfocus(event) {
    this._submitting = true;
    setTimeout(() => {
      let hasFocus = $(":focus").length;
      if ( !hasFocus ) this._onSubmit(event);
      this._submitting = false;
    }, 25);
  }
}
