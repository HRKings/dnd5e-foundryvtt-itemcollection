// import { DND5E } from '../../../systems/dnd5e/module/config.js';
// import Item5e from '../../../systems/dnd5e/module/item/entity.js';
// import ItemSheet5e from '../../../systems/dnd5e/module/item/sheet.js';

import { getCanvas, MODULE_NAME } from "./settings";
import { ItemSheet5eWithBags } from "./ItemSheet5eWithBags"

// let knownSheets = {};
// let templates = {};

export class ItemSheetShop extends ItemSheet5eWithBags {
  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      width: 570,
      height: 500,
      //@ts-ignore
      showUnpreparedSpells: true
    });
    return options;
  }

  get template() {
    return  `/modules/${MODULE_NAME}/templates/shop-sheet.html`;
  }


  render(...args) {
    super.render(...args);
  }

  async _onSubmit(event, {updateData=null, preventClose=false}={}) {
    if (this.item.type !== "backpack") updateData = expandObject({"flags.-=itemcollection": null});
      super._onSubmit(event, {"updateData": updateData, "preventClose": preventClose})
  }

  async getData(options) {
    const type = this.item.data.type;

    if (!["backpack"].includes(type)) {
      ui.notifications.error(game.i18n.localize(MODULE_NAME+".wrongType"))
      this.options.editable = false;
      return super.getData(options);
    };
  

    // this._sheetTab="details"

    const item = this.item;
    var data:any = await super.getData(options);
    if (!hasProperty(data.flags, MODULE_NAME+".markup"))
      setProperty(data.flags,MODULE_NAME+".markup", 10);

    let markup = (getProperty(data.flags,MODULE_NAME+".markup") || 0) / 100;
    let nameFilter = item.data.flags.itemcollection.nameFilter;
    for (let i = 0; i < data.flags.itemcollection.contentsData.length; i++) {
      let itemData = data.flags.itemcollection.contentsData[i];
      itemData.display = !nameFilter || (itemData.name.toLocaleLowerCase().includes(nameFilter))
      if (!itemData.data.price)
        itemData.data.marketPrice = "";
      else
        itemData.data.marketPrice = Math.ceil((itemData.data.price ?? 0) * (1+markup) * 100) / 100;
      if (itemData.data.marketPrice > 10) itemData.data.marketPrice = Math.ceil(itemData.data.marketPrice)
    }

    //this.baseapps.options.editable = this.baseapps.options.editable// && (!this.item.actor || !this.item.actor.token);
    return data;
  }

  async _onDragItemStart(event) {
    event.stopPropagation();
    if (game.user.isGM) super._onDragItemStart(event);
    // return true;
  }

  canAdd(itemData) {
    return true;
  }

  // don't allow exporting for shops
  async _itemExport(event) {
    event.stopPropagation();

    // return true;
    // no exporting for shops
  }

  async _itemConvertToGold(event) { // this will be the purchase option
    event.stopPropagation();
    // find out the actor doing the buying and flag error if no selecte
    let actor;
    if (getCanvas()?.tokens.controlled.length > 0) {
      actor = getCanvas().tokens.controlled[0].actor;
    }
    if (!actor) actor = game.actors.get(ChatMessage.getSpeaker().actor);
    if (!actor) {
      ui.notifications.warn(`${game.i18n.localize(MODULE_NAME+".noSelection")}`)
      return;
    }

    // find the item
    let li = $(event.currentTarget).parents(".item");
    let id = li.attr("data-item-id");
    let itemData = this.item.items.get(id).data;

    // ask how many they want to buy
    let quantity = 1;

    let markup = (getProperty(this.item.data.flags,MODULE_NAME+".markup") || 0) / 100;
    let goldValue = Math.floor((itemData.data.price * (1 + markup) * 10000))/ 10000 * quantity;
    console.error("Gold value is ", goldValue)
    let currency = duplicate(actor.data.data.currency);
    // check if they have enough money to pay for it and the currency adjustments needed.
    let coinValue = currency ?  Object.keys(currency)
        .reduce((val, denom) => val += {"pp" :10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01}[denom] * currency[denom], 0) : 0;
    if (coinValue < goldValue) {
      ui.notifications.error(game.i18n.localize(MODULE_NAME+".NotEnoghGold"))
      return;
    }
    coinValue = (coinValue - goldValue) * 100; // how much we have left
    let conversion = {"cp" : 10, "sp": 10, "ep": 5, "gp": 10, "pp": 100000000000000};
    let newCurrency = ["cp", "sp", "gp", "pp"].reduce((nc,denom) => {
      nc[denom] =  Math.floor(coinValue % conversion[denom]);
      coinValue = denom !== "pp" ? Math.floor(coinValue / conversion[denom]) : coinValue;
      return nc;
    }, {"pp" : 0, "gp": 0, "ep": 0, "sp": 0, "cp": 0});

    // remove the gold from the actor
    // currency.gp -= goldValue;
    await actor.update({"data.currency": newCurrency});

    // add the item to the actor
    let doMerge = true;
    let existing = actor.items.find(i=>i.name === itemData.name && i.type === itemData.type);
    console.error("existing is ", existing)
    if (existing && doMerge) {
      await actor.updateEmbeddedDocuments("Item", [{"_id": existing.id, "data.quantity": (existing.data.data.quantity || 0) + quantity}]);
    } else {
      let newItem = duplicate(itemData);
      newItem.data.quantity = quantity;
      await actor.createEmbeddedDocuments("Item", [newItem]);
    }
    // add the gold to the shop
    currency = duplicate(this.item.data.data.currency);
    currency.gp += goldValue;
    Hooks.once("updateItem", async () => {
      itemData.data.quantity -= quantity;
      if (itemData.data.quantity  <= 0) {
        await this.item.deleteEmbeddedDocuments("Item", [id]);
      } else {
          await this.item.updateEmbeddedDocuments("Item", [{"_id": itemData._id, "data.quantity": itemData.data.quantity}]);
      }
    });
    await this.item.update({"data.currency": currency})

    // remove the item from the shop deleting the item if the shop runs out
    
//    this.render(false);
  }

  async _exportAll(event) {
    event.stopPropagation();
    //return false;
  }
  
  update(data,options) {
    //ev.stopPropagation();
    this.item.update(data, options)
  }
  
  async _editItem(event) {
    if (!game.user.isGM) return;
    super._editItem(event);
  }

  _onItemSummary(event) {
    event.stopPropagation();
    return;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Everything below is only needed if the sheet is editable
    if ( !this.options.editable ) return;

    html.find("input").focusout(this._onUnfocus.bind(this));

    // Delete Inventory Item
      html.find('.item-delete').off().click(ev => {
        if (game.user.isGM) {
          let li = $(ev.currentTarget).parents(".item"),
          itemId = li.attr("data-item-id");
          this.item.deleteEmbeddedDocuments("Item", [itemId]);
        }
      });
  }

  _onDragEnd(event) {
    event.stopPropagation()
    if (game.user.isGM) {
      super._onDragEnd(event);
    }
    return false;
  }
  _onDragOver(event) {
    event.preventDefault();
    return false;
  }

  _onUnfocus(event) {
    // this._submitting = true;
    setTimeout(() => {
      let hasFocus = $(":focus").length;
      if ( !hasFocus ) this._onSubmit(event);
      // this._submitting = false;
    }, 25);
  }
}
