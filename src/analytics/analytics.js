const ua = require('universal-analytics');

const { GA_TRACKING_ID } = process.env;

const tracker = ua(GA_TRACKING_ID);

const trackEndpointUsage = (req, res, next) => {
  if (req.path === '/user/login') {
    tracker.pageview('/user/login').send();
  } else if (req.path === '/user/register') {
    tracker.pageview('/user/register').send();
  } else if (req.path === '/ticket/add') {
    tracker.pageview('/ticket/add').send();
  } else if (req.path === '/ticket/newmessage') {
    tracker.pageview('/ticket/newmessage').send();
  }

  next();
};

module.exports = trackEndpointUsage;