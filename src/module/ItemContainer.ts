export function  getActor() { // needed to control vaious initialisation in dnd5e
  if (this.parent instanceof Item) return null;
  return this.parent;
}

export async function createEmbeddedDocuments(wrapped, embeddedName, data, context) {
  if (this.type !== "backpack" || embeddedName !== "Item") return wrapped(embeddedName, data, context);
  if (!Array.isArray(data)) data = [data];
  const currentItems = duplicate(getProperty(this, "data.flags.itemcollection.contentsData") ?? []);
  
  if (data.length) {
    for (let itemData of data) {
      let theData = itemData;
      theData._id = randomID();
      //@ts-ignore documentClass
      theData = new CONFIG.Item.documentClass(theData, {parent: this}).toJSON();
      //@ts-ignore
      currentItems.push(theData);
    }
    if (this.parent) return this.parent.updateEmbeddedDocuments("Item", [{"_id": this.id, "flags.itemcollection.contentsData": currentItems}]);
    else setCollection(this, currentItems);
  }
}

export function isEmbedded() {
  // for items with an item parent we need to relax the definition a bit.
  // TODO find out how to do this with proper wrapping
  if (!(this.parent instanceof Item))
    return (this.parent !== null) && (this.documentName in this.parent.constructor.metadata.embedded);
  return (this.parent !== null);
}
export  async function createDocuments(wrapped, data=[], context={parent: {}, pack: {}, options: {}}) {
  const {parent, pack, options} = context;
  if (!(this.type === "backpack" && parent instanceof Item)) return wrapped(data, context);
  //@ts-ignore createEmbeddedDocuments
  await parent.createEmbeddedDocuments("Item", data, options)
}

export function getEmbeddedDocument(wrapped, embeddedName, id, {strict=false} = {}) {
  if (this.type !== "backpack") return wrapped(embeddedName, id, {strict});
  return this.items.get(id);
}

export async function updateEmbeddedDocuments(wrapped, embeddedName, data, options)  {
  if (this.type !== "backpack" || embeddedName !== "Item") return wrapped(embeddedName, data, options);
  const contained = getProperty(this, "data.flags.itemcollection.contentsData") ?? [];
  if (!Array.isArray(data)) data = [data];
  let updated = [];
  let newContained = contained.map(existing => {
    let theUpdate = data.find(update => update._id === existing._id);
    if (theUpdate) {
      const newData = mergeObject(theUpdate, existing, {overwrite: false, insertKeys: true, insertValues: true, inplace: false});
      updated.push(newData);
      return newData;
    }
    return existing;
  })

  if (updated.length > 0) {
    if (this.parent) {
      await this.parent.updateEmbeddedDocuments("Item", [{ "_id": this.id, "flags.itemcollection.contentsData": newContained}]);
    } else {
      await setCollection(this, newContained);
    }
  }
  return updated;
}

export async function updateDocuments(wrapped, updates=[], context={parent: {}, pack: {}, options: {}}) {
  const {parent, pack, options} = context;
  // An item whose parent is an item only exists in the parents embedded documents
  if (!(parent instanceof Item && parent.type !== "backpack")) return wrapped(updates, context);
  //@ts-ignore updateEmbeddedDocuments
  return parent.updateEmbeddedDocuments("Item", updates, options)
}

async function setCollection(item, contents) {
  item.update({"flags.itemcollection.contentsData": duplicate(contents)});
}

export async function deleteEmbeddedDocuments(wrapped, embeddedName, ids=[], options={}) {
  if (this.type !== "backpack" || embeddedName !== "Item") return wrapped(embeddedName, ids, options)
    const containedItems = getProperty(this.data, "flags.itemcollection.contentsData") ?? [];
    const newContained = containedItems.filter(itemData => !ids.includes(itemData._id))
    const deletedItems = this.items.filter(item => ids.includes(item.id));
    if (this.parent) {
      await this.parent.updateEmbeddedDocuments("Item", [{"_id": this.id, "flags.itemcollection.contentsData": newContained}]);
    }
    else {
      await setCollection(this, newContained);
    }
    return deletedItems;
  }

export async function deleteDocuments(wrapped, ids=[], context={parent: {}, pack: {}, options: {}}) {
  const {parent, pack, options} = context;
  if (!(parent instanceof Item && parent.type === "backpack")) return wrapped(ids, context);
  // an Item whose parent is an item only exists in the embedded documents
  //@ts-ignore
  return parent.deleteEmbeddedDocuments("Item", ids)
}

export function getEmbeddedCollection(wrapped, type) {
  if (type === "Item" && this.type === "backpack") return this.items;
  return wrapped(type); 
}

export function prepareDerivedData(wrapped) {
  wrapped();
  if (!(this instanceof Item && this.type === "backpack")) return;
  this.data.data.weight = this.calcWeight();
  this.data._source.data.weight = this.calcWeight();
  this.data.data.price = this.calcPrice();
  this.data._source.data.price = this.calcPrice();
}

export function prepareEmbeddedEntities(wrapped) {
  wrapped();
  if (!(this instanceof Item && this.type === "backpack")) return;
  const containedItems = getProperty(this.data.flags, "itemcollection.contentsData") ?? [];
  //@ts-ignore foundry
  const oldItems = this.items;
  //@ts-ignore foundry
  this.items = new foundry.utils.Collection();
  containedItems.forEach(idata => {
    if (!(oldItems?.has(idata._id))) {
      //@ts-ignore doculemtnClass
      const theItem = new CONFIG.Item.documentClass(idata, { parent: this });
      this.items.set(idata._id, theItem)
    } else { // TODO see how to avoid this - here to make sure the contained items is correctly setup
      const currentItem = oldItems.get(idata._id);
      setProperty(currentItem.data._source, "flags", idata.flags);
      setProperty(currentItem.data._source, "data", idata.data);
      currentItem.prepareData();
      this.items.set(idata._id, currentItem)
      if (this.sheet) {
        this.data.data.weight = this.calcWeight();
        currentItem.render(false, { action: "update", data: currentItem.data });
      }
    }
  });
}

export async function _update(wrapped, data) {
  if (!(this.parent instanceof Item)) return wrapped(data);
  //@ts-ignore foundry
  data = foundry.utils.expandObject(data);
  data._id = this.id;
  await this.parent.updateEmbeddedDocuments("Item", [data]);
  this.render(false, { action: "update", data: data });

}

export async function _delete(wrapped, data) {
  if (!(this.parent instanceof Item)) return wrapped(data);
  return this.parent.deleteEmbeddedDocuments("Item", [this.id])
}

export async function _onCreateDocuments(wrapped, items, context) {
  if (!(context.parent instanceof Item && this.type === "backpack")) return wrapped(items, context);
  const toCreate = [];
  for ( let item of items ) {
    for ( let e of item.effects ) {
      if ( !e.data.transfer ) continue;
      const effectData = e.toJSON();
      effectData.origin = item.uuid;
      toCreate.push(effectData);
    }
  }
  if ( !toCreate.length ) return [];
  //@ts-ignore
  const cls = getDocumentClass("ActiveEffect");
  return cls.createDocuments(toCreate, context);
}

export function calcWeight() {
  if (this.type !== "backpack") return _calcItemWeight(this);
  const weightless = getProperty(this, "data.data.capacity.weightless") ?? false;
  if (weightless) return getProperty(this, "data.flags.itemcollection.bagWeight")  ?? 0;
  return this.calcItemWeight() + (getProperty(this, "data.flags.itemcollection.bagWeight")  ?? 0);
}

export function calcItemWeight() {
  if (this.type !== "backpack") return _calcItemWeight(this);
  let weight = this.items.reduce((acc, item) => {
      return acc + (item.calcWeight() ?? 0);
   }, (this.type === "backpack" ? 0 : _calcItemWeight(this)) ?? 0);
   const currency = this.data.data.currency ?? {};
   const numCoins =  currency ? Object.keys(currency).reduce((val, denom) => val + currency[denom], 0) : 0;
   return Math.round(weight + numCoins / 50);
}

export function containedItemCount() {
  if (this.type !== "backpack") return (this.data.data.quantity ?? 1);
  return this.items.reduce((acc, item) => acc + item.containedItemCount(), 0);
}

export function _calcItemPrice(item) {
  if (item.type === "backpack") return item.data.flags.itemcollection?.bagPrice ?? 0;
  let quantity = item.data.data.quantity || 1;
  let price = item.data.data.price || 0;
  return Math.round(price * quantity * 100) / 100;
}

export function _calcItemWeight(item) {
  let quantity = item.data.data.quantity || 1;
  let weight = item.data.data.weight || 0;
  return Math.round(weight * quantity * 100) / 100;
}
export function calcPrice() {
  if (this.type !== "backpack") return _calcItemPrice(this);
  const currency = this.data.data.currency ?? {};
  const coinValue =  currency ? Object.keys(currency)
      .reduce((val, denom) => val += {"pp" :10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01}[denom] * currency[denom], 0) : 0;
  const price = this.items.reduce((acc, item) => acc + (item.calcPrice() ?? 0), _calcItemPrice(this) || 0);
  return Math.round((price + coinValue) * 100) / 100;
}