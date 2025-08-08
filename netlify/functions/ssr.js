const path = require('path');
const server = require('../../dist/angular-starter/server/main.js');

exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
    url: event.rawUrl,
    headers: event.headers,
    body: event.body,
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader: (key, value) => {
      res.headers[key] = value;
    },
    appendHeader: (key, value) => {
      if (!res.headers[key]) {
        res.headers[key] = value;
      } else {
        const existing = res.headers[key];
        res.headers[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      }
    },
    end: (body) => {
      res.body = body;
    },
  };

  try {
    const expressApp = server.app();
    await new Promise((resolve, reject) => {
      const fakeRes = {
        ...res,
        send: (body) => {
          res.end(body);
          resolve();
        },
        status: (code) => {
          res.statusCode = code;
          return fakeRes;
        },
      };

      expressApp(req, fakeRes, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `SSR error: ${error.message || error}`,
    };
  }
};
