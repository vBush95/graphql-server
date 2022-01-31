//Cors
// const allowedDomains = [
//   "http://localhost:3000",
//   "ws://localhost:4000",
//   "https://studio.apollographql.com",
//   "https://client-meine-tolle-seite-1.herokuapp.com",
// ];

const allowedDomains = ["https://client-meine-tolle-seite-1.herokuapp.com"];
const verifyOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);

  if (allowedDomains.indexOf(origin) === -1) {
    var msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
    return callback(new Error(msg), false);
  }
  return callback(null, true);
};

const corsOptions = {
  origin: verifyOrigin,
  //origin: "http://localhost:3000",
  //origin: "https://studio.apollographql.com",
  credentials: true,
};

module.exports = corsOptions;
