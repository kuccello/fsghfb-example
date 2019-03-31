/* eslint-disable no-useless-computed-key */
import React, { Component } from 'react';
import { createTheme, ThemeProvider } from 'mineral-ui/themes'
import * as firebase from 'firebase'
import Clicker from './components/clicker'
import axios from 'axios'

const config = {
  apiKey: "AIzaSyA7brUKWBeD1EsNN1MiY-jfLoN5qSocVZ0",
  authDomain: "fsghfb-example.firebaseapp.com",
  projectId: "fsghfb-example",
}
firebase.initializeApp(config)

const myAppColor = {
  [10]: '#faf0f4',
  [20]: '#fad4e4',
  [30]: '#fab4d1',
  [40]: '#f78bb8',
  [50]: '#ed5393',
  [60]: '#d6246e',
  [70]: '#b01355',
  [80]: '#8a1244',
  [90]: '#611535',
  [100]: '#421527'
}

const myTheme = createTheme({
  colors: {
    theme: myAppColor,
    danger: 'bronze',
    warning: 'dusk',
    success: 'teal'
  }
})

class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      githubToken: null
    }

    firebase.auth().onAuthStateChanged(this.authStateObserver)

    firebase.auth().getRedirectResult().then(async (result) => {
      if (result.credential) {
        // This gives you a GitHub Access Token. You can use it to access the GitHub API.
        const token = result.credential.accessToken
        const path = process.env.REACT_APP_FIREBASE_FUNCTIONS + '/issueFiler'
        const firebaseToken = await firebase.auth().currentUser.getIdToken(true)
        const request = axios.create({
          headers: {
            'Authorization': 'Bearer ' + firebaseToken
          }
        })
        const response = await request.post(path + '/user/githubtoken', {
          ghtoken: token
        }).catch(err => {
          console.error(err.message)
        })
        console.log(response)
      }
    }).catch(function(error) {
      console.error(error)
    });
  }

  authStateObserver(user) {
    if (user) {
      // User is signed in
      window.FS.identify(user.email)
      window.FS.setUserVars({
        displayName: user.displayName,
        email: user.email,
        uid: user.uid,
        pricingPlan_str: "free"
      })
      window.FS.log('info', `${user.email} successfully signed in with Firebase using GitHub as the provider.`)
    } else {
      window.FS.log('warn', 'Missing user authentication, redirecting to Google auth provider...')
      // User is not signed in
      const provider = new firebase.auth.GithubAuthProvider()
      provider.addScope('repo')
      firebase.auth().signInWithRedirect(provider)
    }
  }

  render() {
    return (
      <ThemeProvider theme={myTheme}>
        <Clicker user={firebase.auth().currentUser}/>
      </ThemeProvider>
    );
  }
}

export default App;
