/* eslint-disable promise/no-nesting */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const fullstory = require('fullstory');
const axios = require('axios');

admin.initializeApp();

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
}

const validateFirebaseIdToken = (req, res, next) => {
  console.log('Check if request is authorized with Firebase ID token');
  console.log(req.headers);

  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
      !req.cookies.__session) {
    console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
        'Make sure you authorize your request by providing the following HTTP header:',
        'Authorization: Bearer <Firebase ID Token>',
        'or by passing a "__session" cookie.');
    res.status(403).send('Unauthorized');
    return;
  }

  let idToken;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  }
  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    req.user = decodedIdToken;
    next();
    return;
  }).catch(error => {
    console.error('Error while verifying Firebase ID token:' + idToken, error);
    res.status(403).send('Unauthorized');
  });
}

// Uncomment to add CORS restrictions along with the CORS options delegate below
// const data = {
//   whitelist: [
//     "http://localhost:3000",
//     "http://localhost:3001",
//     "http://localhost:3002",
//     "http://localhost:4000",
//     "http://localhost:5000",
//     "http://localhost:8080",
//     "https://constellation-dev-18ed2.firebaseapp.com"
//   ]
// }

const corsOptionsDelegate = function (req, callback) {
  // If you want to add proper CORS support uncomment the following
  // let corsOptions;
  // const origin = req.header('Origin');
  // if (data.whitelist.indexOf(origin) !== -1) {
  //   corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  // } else {
  //   corsOptions = { origin: false } // disable CORS for this request
  // }
  // callback(null, corsOptions)
  callback(null, { origin: true }) // callback expects two parameters: error and options
}
const cors = require('cors')(corsOptionsDelegate);
const app = express();

app.use(cors);

app.get('/alive', (request, response, next) => {
  console.log(request)
  response.send('Alive')
})
app.post('/getSessonList', validateFirebaseIdToken, asyncMiddleware(async (request, response, next) => {
  const fullstoryToken = functions.config().fullstory.token;
  const sessions = await fullstory.getSessions(
    {
      email: request.user.email,
      limit: 5
    },
    fullstoryToken
  )
    .then(sessions => {
      return sessions
    })
    .catch(err => {
      throw(err)
    })
  response.json(sessions)
}))
app.post('/submitIssue', validateFirebaseIdToken, asyncMiddleware(async (request, response, next) => {
  console.warn('Submit Issue Called', `${request.user.email}`)
  const creds = await admin.firestore()
    .collection(`${request.user.email}`)
    .doc('credentials')
    .get()
    .then(snapshotDoc => {
      if (snapshotDoc.exists) {
        return snapshotDoc.data()
      }
      console.log('No creds doc found for ' + request.user.email)
      return null
    })
    .catch(err => {
      console.error(err)
      throw err
    })

  if (creds) {
    const sessions = request.body.fullstorySessions.map(sessionInfo => sessionInfo.sessionUrl).join('\nUser Session: ')
    const payload = {
      title: `[${request.body.component.name}] ${request.body.title}`,
      body: `${request.body.message}\n${sessions}`,
      labels: ["Submitted From App", `${request.body.component.id}`]
    }
    console.info(sessions)
    console.info(payload)
    const result = await axios.create({
      headers: {
        'Authorization': `token ${creds.ghtoken}`
      }
    }).post('https://api.github.com/repos/kuccello/fsghfb-example/issues', payload)
    .then((axiosResponse) => {
      console.log(axiosResponse.data);
      return axiosResponse.data
    })
    .catch((error) => {
      console.log(error);
      throw error;
    });

    const issueRef = admin.firestore().collection(request.user.email).doc()
    issueRef.set({
      githubIssue: result,
      sessions: request.body.fullstorySessions
    })
    console.info(JSON.stringify(result))
    response.json({githubUrl: result.html_url, githubIssueNumber: result.number})
  } else {
    response.json({error: 'Invalid GitHub Creds.'})
  }
}))

app.post('/user/githubtoken', validateFirebaseIdToken, asyncMiddleware(async (request, response, next) => {
  const user = request.user;
  const token = request.body.ghtoken
  admin.firestore().collection(user.email).doc('credentials').set({
    ghtoken: token
  }).then(notused => {
    response.json({ok: true})
    return
  }).catch(err => {
    response.json({ok: false})
    throw err
  })
}))

app.post('/github/webhook', (request, response) => {
  console.log(request.body)
  response.status(200).send('OK')
})


exports.issueFiler = functions.https.onRequest((request, response) => {
  if (!request.path) {
    request.url = `/${request.url}` // prepend '/' to keep query params if any
  }
  console.log('handing off to app')
  return app(request,response)
});