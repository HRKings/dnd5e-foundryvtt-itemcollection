import { debug, log, setDebugLevel, warn, i18n } from '../ItemCollection';

export const MODULE_NAME = 'itemcollection';

/**
 * Because typescript doesn’t know when in the lifecycle of foundry your code runs, we have to assume that the
 * canvas is potentially not yet initialized, so it’s typed as declare let canvas: Canvas | {ready: false}.
 * That’s why you get errors when you try to access properties on canvas other than ready.
 * In order to get around that, you need to type guard canvas.
 * Also be aware that this will become even more important in 0.8.x because a „no canvas“ mode is being introduced there.
 * So you will need to deal with the fact that there might not be an initialized canvas at any point in time.
 * @returns
 */
 export function getCanvas(): Canvas {
  if (!(canvas instanceof Canvas) || !canvas.ready) {
    return undefined;
  }
  return canvas;
}

export const registerSettings = function () {
    setup(ItemCollectionTemplate);
}

let ItemCollectionTemplate = (function() {
  let config = {
    /**
     * The Module name
     */
    name: MODULE_NAME,

    /**
     * The module title
     */
    title: "Item Collection Settings",

    /**
     * Some generic path references that might be useful later in the application's windows
     */
    path: {
      root: `/modules/${MODULE_NAME}/`,
      itemSideBarTemplate:`/modules/${MODULE_NAME}/templates/bag-sheet.html`,
      itemDetailsTemplate:`/modules/${MODULE_NAME}/templates/shop-sheet.html`,
    },
    settings: [
      {
        name: "goldConversion",
        scope: "world",
        default: true,
        type: Boolean
      }, {
        name: "goldConversionPercentage",
        scope: "world",
        default: 50,
        type: Number
      },{
        name: "sortBagContents",
        scope: "module",
        default: true,
        type: Boolean
      }
    ]
  };

  return {
    path: () => {
        return config.path
    },
    settings: function() {
      return config.settings;
    },
    name: () => {
        return config.name
    },
    title: () => {
        return config.title
    }
  }
})();

function setup(templateSettings) {
	templateSettings.settings().forEach(setting => {
		let options:ClientSettings.PartialSetting = {
       name: i18n(`${templateSettings.name()}.${setting.name}.Name`),
      hint: i18n(`${templateSettings.name()}.${setting.name}.Hint`),
			scope: setting.scope,
			config: true,
			default: setting.default,
			type: setting.type,
		};
		if (setting.choices) {
      options.choices = setting.choices;
    }
		game.settings.register(templateSettings.name(), setting.name, options);
	});
}