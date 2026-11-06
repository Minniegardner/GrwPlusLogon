const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = 3000;

const appRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "failed", message: "Too many requests, please try again later." }
});

app.set('trust proxy', 1);
app.use(appRateLimit);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.set("view engine", "ejs");

function sendJson(res, data) {
  return res.send(JSON.stringify(data));
}

app.post("/player/login/dashboard", async (req, res) => {
  try {
    let loginInfo = "";

    if (req.body && typeof req.body === 'object') {
      const keys = Object.keys(req.body);
      if (keys.length > 0 && typeof keys[0] === 'string') {
        loginInfo = Buffer.from(keys[0], "utf8").toString("base64");
      }
    }

    res.render("dashboard", { token: loginInfo });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return sendJson(res, { status: "failed", message: "Internal server error.", token: "", url: "", accountType: "growtopia" });
  }
});

app.post("/player/growid/login/validate", async (req, res) => {
  try {
    const { _token, growId, password, email } = req.body;

    if (!_token || !growId || (!growId && !password)) {
      return sendJson(res,
        {
          status: "failed",
          message: "Something is missing, please try login again.",
          token: "",
          url: "",
          accountType: "growtopia"
        }
      );
    }

    if (
      typeof growId !== 'string' || growId.length < 3 || growId.length > 20 ||
      typeof password !== 'string' || password.length > 25 ||
      typeof _token !== 'string' || _token.length < 100 || _token.length > 4096
    ) {
      return sendJson(res,
        {
          status: "failed",
          message: "Input error, please try login again.",
          token: "",
          url: "",
          accountType: "growtopia"
        }
      );
    }

    const cleanGrowId = growId.replace(/[^a-zA-Z0-9]/g, "");
    if(cleanGrowId !== growId) {
      return sendJson(res, { status: "failed", message: "Invalid characters in GrowID.", token: "" });
    }

    const decodedToken = Buffer.from(_token, "base64").toString("utf8");;

    // Registration flag (1:1 with gtps): presence of an email marks this as a
    // new-account registration (has_reg=1); otherwise it is a login for an
    // existing account (has_reg=0). The game/Master performs the actual account
    // creation and validation on the has_reg=1 path, exactly like Referensi/gtps.
    const has_reg = (email && typeof email === 'string' && email.length > 0) ? '1' : '0';

    const rawTokenData = `loginInfo=${decodedToken}&growID=${growId}&password=${password}` +
                         (email ? `&email_reg=${email}&has_reg=${has_reg}` : `&has_reg=0`);
    const generatedToken = Buffer.from(rawTokenData, "utf8").toString("base64");

    return sendJson(res,
      {
        status: "success",
        message: "Account Validated.",
        token: generatedToken,
        url: "",
        accountType: "growtopia"
      }
    );

  } catch (error) {
    console.error("Validate Error:", error);
    return sendJson(res, { status: "failed", message: "Internal server error.", token: "", url: "", accountType: "growtopia" });
  }
});

app.post('/player/growid/checktoken', async (req, res) => {
  return res.redirect(307, '/player/growid/validate/checktoken');
});

function extractParams(input) {
  if(!input) return {};

  let searchStr = '';
  
  if(typeof input === 'object' && input !== null) {
    if('clientData' in input || 'refreshToken' in input) {
      return { refreshToken: input.refreshToken, clientData: input.clientData };
    }

    const keys = Object.keys(input);
    if(keys.length === 1) searchStr = keys[0];
  } 
  else if (typeof input === 'string') {
    searchStr = input;
  }

  const params = new URLSearchParams(searchStr);
  return {
    refreshToken: params.get('refreshToken') || undefined,
    clientData: params.get('clientData') || undefined,
  };
}

app.post("/player/growid/validate/checktoken", async (req, res) => {
  try {
    let { refreshToken, clientData } = extractParams(req.body);

    if(!clientData || !refreshToken) {
      return sendJson(res, { status: "failed", message: "Session token is missing.", token: "", url: "", accountType: "growtopia" });
    }

    // Re-issue the session token, substituting the client-provided login
    // parameters where present while preserving the registration flag so the
    // Master can still create a new account when this originated as a
    // has_reg=1 registration.
    let decoded = Buffer.from(refreshToken, "base64").toString("utf8");
    let token = refreshToken;
    try {
      const refined = decoded.replace(
        /(_token=)[^&]*/,
        `$1${Buffer.from(clientData).toString('base64')}`
      );
      token = Buffer.from(refined, "utf8").toString("base64");
    } catch (e) {
      token = refreshToken;
    }

    return sendJson(res,
      {
        status: "success",
        message: "Token is valid.",
        token: token,
        url: "",
        accountType: "growtopia"
      }
    );
  }
  catch (error) {
    console.error("Checktoken Error:", error);
    return sendJson(res, { status: "failed", message: "Internal server error.", token: "", url: "", accountType: "growtopia" });
  }
});

app.get("/player/validate/close", (req, res) => {
  sendJson(res, { status: "close" });
});

app.get("/", (req, res) => {
  res.send("Hello there.");
})

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'favicon.ico'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});