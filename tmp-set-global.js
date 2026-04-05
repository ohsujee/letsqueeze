const admin = require("firebase-admin");
const sa = require("/opt/punkrecords-sa.json");
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: "https://letsqueeze-default-rtdb.europe-west1.firebasedatabase.app" });
admin.database().ref("config/forceUpdateVersion").set("0.0.0").then(() => { console.log("OK - global set to 0.0.0"); process.exit(0); });
