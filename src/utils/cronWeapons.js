const cron = require("node-cron");
const axios = require("axios");
const { exec } = require("child_process");
const steaminventory = require("get-steam-inventory");
const {
  AcidFadeCalculator,
  AmberFadeCalculator,
  FadeCalculator,
} = require("csgo-fade-percentage-calculator");
const Weapon = require("../api/models/Weapon.model");

const aregodasInventory = "76561198322754349";

const dopplerPhases = {
  418: "Phase 1",
  419: "Phase 2",
  420: "Phase 3",
  421: "Phase 4",
  415: "Ruby",
  416: "Sapphire",
  417: "Black Pearl",
  569: "Phase 1",
  570: "Phase 2",
  571: "Phase 3",
  572: "Phase 4",
  568: "Emerald",
  618: "Phase 2",
  619: "Sapphire",
  617: "Black Pearl",
  852: "Phase 1",
  853: "Phase 2",
  854: "Phase 3",
  855: "Phase 4",
  1119: "Emerald",
  1120: "Phase 1",
  1121: "Phase 2",
  1122: "Phase 3",
  1123: "Phase 4",
};

async function fetchGetUrl(url, retryCount = 3) {
  let attempt = 0; // Current attempt
  while (attempt < retryCount) {
    try {
      const response = await axios.get(url);
      // If the request was successful, return the data
      if (response.status === 200) {
        return response.data;
      } else {
        // If the response status is not 200, throw an error to be caught by the catch block
        throw new Error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.error(
          `Attempt ${attempt + 1}: Error 400 on request ${url}. Retrying...`
        );
        attempt++;
        // Optional: add a delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 1 second delay
      } else {
        // If the error is not a 400, log and break from the loop
        console.error(`Error on request ${url}: ${error}`);
        return;
      }
    }
  }
  console.error(`Failed to fetch ${url} after ${retryCount} attempts.`);
  return;
}

async function fetchUrl(url, config = {}, method = "GET", retryCount = 3) {
  let attempt = 0; // Current attempt
  while (attempt < retryCount) {
    try {
      let headers = {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        Origin: "https://buff.163.com",
        Host: "buff.163.com",
        Referer: "https://buff.163.com/market/?game=csgo",
        Pragma: "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: `session=${encodeURIComponent(
          config.session
        )}; Device-Id=1f8oIYfTr1ux65Tp5exw; game=csgo; Locale-Supported=es;csrf_token=${
          config.csrf_token
        }`,
      };

      if (method === "POST") {
        headers["Content-Type"] = "application/json";
        headers["X-CSRFToken"] = config.csrf_token;
      }

      let axiosConfig = {
        url,
        method,
        headers,
      };

      if (method === "POST" && config.body) {
        axiosConfig.data = JSON.stringify(config.body);
      }

      const response = await axios(axiosConfig);

      // If the request was successful or not a 400, return the data
      if (response.status === 200) {
        return response.data;
      } else {
        // If the response status is not 200, throw an error to be caught by the catch block
        throw new Error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.error(
          `Attempt ${
            attempt + 1
          } for ${method} request to ${url}: Error 400. Retrying...`
        );
        attempt++;
        // Optional: add a delay before retrying
        await new Promise((resolve) => setTimeout(resolve, 200)); // 1 second delay
      } else {
        // If the error is not a 400 or no more retries left, log and return
        console.error(`Error on ${method} request to ${url}: ${error}`);
        return;
      }
    }
  }
  console.error(
    `Failed to complete ${method} request to ${url} after ${retryCount} attempts.`
  );
  return;
}

function extractData(data, ownerId) {
  if (!data) {
    console.error("Data is missing necessary properties");
    return [];
  }

  const classIdToAssetId = data.assets.reduce((acc, asset) => {
    acc[asset.classid] = asset.assetid;
    return acc;
  }, {});

  const itemsData = data.items
    .map((item) => {
      const assetId = classIdToAssetId[item.classid];
      if (!assetId) {
        console.warn(`Asset ID not found for class ID: ${item.classid}`);
        return null;
      }
      const marketName = item.name;
      let actionLink = undefined;

      if (item.actions && item.actions.length > 0) {
        actionLink = item.actions[0].link
          .replace("%assetid%", assetId)
          .replace("%owner_steamid%", ownerId);
      }

      return { assetId, marketName, actionLink };
    })
    .filter((item) => item !== null); // Filtrar elementos nulos si no se encontró el assetId

  return itemsData;
}

function getFadeCalculatorAndSupportedWeapon(asset) {
  const FADE_TYPE_TO_CALCULATOR = {
    Fade: FadeCalculator,
    "Acid Fade": AcidFadeCalculator,
    "Amber Fade": AmberFadeCalculator,
  };

  for (const [fadeType, calculator] of Object.entries(
    FADE_TYPE_TO_CALCULATOR
  )) {
    for (const supportedWeapon of calculator.getSupportedWeapons()) {
      if (asset.marketName.includes(`${supportedWeapon} | ${fadeType}`)) {
        return [calculator, supportedWeapon.toString()];
      }
    }
  }
}

function getFadePercentage(asset, paintseed) {
  const fadeCalculatorAndSupportedWeapon =
    getFadeCalculatorAndSupportedWeapon(asset);

  if (fadeCalculatorAndSupportedWeapon !== undefined) {
    const [calculator, supportedWeapon] = fadeCalculatorAndSupportedWeapon;

    return calculator.getFadePercentage(supportedWeapon, paintseed)?.percentage;
  }
}

async function mainInventory(session_cookie, csrf_token_val) {
  console.log("Actualizando base de datos...");
  // Get raw inventory
  let rawInventory = await steaminventory.getinventory(
    730,
    aregodasInventory,
    "2"
  );

  // Extract data
  const itemsData = extractData(rawInventory, aregodasInventory);
  const itemInvBuff = await fetchUrl(
    "https://buff.163.com/api/market/steam_inventory?game=csgo&force=0&page_num=1&page_size=1000&search=&state=all&_=1710794982602",
    { session: session_cookie, csrf_token: csrf_token_val },
    "GET"
  );

  const usdRequest = await fetchUrl(
    "https://buff.163.com/account/api/prefer/buff_price_currency",
    {
      session: session_cookie,
      csrf_token: csrf_token_val,
      body: { buff_price_currency: "USD" },
    },
    "POST"
  );
  const usdPrice = usdRequest.data.rate_base_cny;

  for (item of itemsData) {
    if (item.actionLink === undefined) {
      continue; // No action link = no valid item
    }

    let targetItem = itemInvBuff.data.items.find(
      (e) => e.asset_info && e.asset_info.assetid === item.assetId
    );
    const newPrice = targetItem
      ? parseFloat(targetItem.sell_min_price) * usdPrice
      : 0;

    // Get data from local api
    const responseJson = await fetchGetUrl(
      `http://localhost:1234/?url=${encodeURIComponent(item.actionLink)}`
    );
    if (!responseJson) continue;
    const response = responseJson.iteminfo;
    if (!response || !response.imageurl) continue;

    // Get more data and request render
    const responseJson2 = await fetchUrl(
      `https://buff.163.com/api/market/csgo_asset/change_state_cs2`,
      {
        session: session_cookie,
        csrf_token: csrf_token_val,
        body: { assetid: item.assetId, contextid: 2 },
      },
      "POST"
    );
    if (!responseJson2) continue;
    const response2 = responseJson2.data;
    if (!response2) continue;

    let paintSeed = response.paintseed;
    let paintIndex = response.paintindex;

    if (paintSeed && dopplerPhases[paintIndex])
      paintSeed = `${paintSeed} (${dopplerPhases[paintIndex]})`;

    // Avoid duplicates
    await Weapon.updateOne(
      { assetId: item.assetId },
      {
        $set: {
          assetId: item.assetId,
          marketName: item.marketName,
          price: newPrice,
          pricePlusPercentage: 5, // Assuming this is a static value you always set
          wearName: response.wear_name,
          actionLink: item.actionLink,
          float: response.floatvalue,
          previewUrl: response2.inspect_preview_url || response2.icon_url,
          imageUrl: response2.inspect_url,
          paintSeed: paintSeed,
          paintIndex: paintIndex,
          phase: dopplerPhases[paintIndex],
          fade: paintSeed
            ? parseFloat(response2?.phase_data?.name.replace("%", "")) ||
              getFadePercentage(item, paintSeed)
            : undefined,
        },
      },
      { upsert: true }
    );
  }

  const itemsIds = itemsData.map((item) => item.assetId);
  await Weapon.deleteMany({ assetId: { $nin: itemsIds } });

  console.log("Base de datos actualizada correctamente.");
}

const CronFunction = async () => {
//   cron.schedule("*/1 * * * *", async () => {
    // Cada 10 minutos
    cron.schedule("0 */3 * * *", async () => { // Cada 3 horas
    try {
      console.log("Ejecutando cron...");
      exec("python3 buff_automated_login.py", (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }

        if (!stdout.startsWith("Error")) {
          if (stdout.split("|") == undefined) {
            console.log(
              "Error en cron: No se pudo obtener la cookie de sesión."
            );
            return;
          }

          const cookie = stdout.split("|")[0]?.trim();
          const csrf_token = stdout.split("|")[1].trim();

          if (!cookie || !csrf_token) {
            console.log(
              "Error en cron: No se pudo obtener la cookie de sesión."
            );
            return;
          }

          mainInventory(cookie, csrf_token).catch(console.error);
        } else {
          console.error(`Login error: ${stdout} | ${stderr}`);
        }
      });
    } catch (error) {
      console.log("Error en cron", error);
    }
  });
};

module.exports = CronFunction;
