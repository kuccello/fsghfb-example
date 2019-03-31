import React, { Component } from 'react'
import Dialog from 'mineral-ui/Dialog'
import TextArea from 'mineral-ui/TextArea'
import Checkbox from 'mineral-ui/Checkbox'
import Text from 'mineral-ui/Text'
import TextInput from 'mineral-ui/TextInput'
import Layout from '../layout'
import axios from 'axios'
import firebase from 'firebase'
import moment from 'moment'

const path = process.env.REACT_APP_FIREBASE_FUNCTIONS + '/issueFiler'

async function createRequestObject() {
  const token = await firebase.auth().currentUser.getIdToken(true)
  const request = axios.create({
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  return request
}

class Issue extends Component {

  constructor(props) {
    super(props)

    this.state = {
      availableSessions: [],
      issueMessage: "",
      issueTitle: "",
      confirmOpen: false,
      githubUrl: '',
      githubIssueId: 0
    }

    this.handleChangeTitle = this.handleChangeTitle.bind(this)
    this.fileIssue = this.fileIssue.bind(this)
  }

  componentDidUpdate(prevProps, prevState) {
    if ((this.props.isOpen !== prevProps.isOpen) && this.props.isOpen) {
      this.getAvailableSessions()
    }
  }

  handleChangeTitle = (event) => {
    this.setState({
      issueTitle: event.target.value
    });
  }

  handleChangeMessage = (event) => {
    this.setState({
      issueMessage: event.target.value
    });
  }

  toggleCheckBox = (idx) => {
    const sessions = [...this.state.availableSessions]
    const session = sessions[idx]
    session.selected = !session.selected
    sessions[idx] = session;
    this.setState({
      availableSessions: sessions
    })
  }

  getAvailableSessions = async () => {
    // Intentionally did not use redux/actions/resolvers for this
    const request = await createRequestObject();
    const response = await request.post(path + '/getSessonList', {}).catch(err => {
      console.error(err.message)
    })
    const sessionRecords = response.data.map(session => {
      return {
        deltaTime: moment(session.CreatedTime*1000).from(moment()),
        sessionUrl: session.FsUrl,
        selected: false,
        userId: session.UserId,
        sessionId: session.SessionId
      }
    })
    this.setState({
      availableSessions: sessionRecords
    })
  }

  cancel = () => {
    this.setState({
      availableSessions: [],
      issueMessage: "",
      issueTitle: "",
      confirmOpen: false,
      githubUrl: '',
      githubIssueId: 0
    })
    window.FS.log('info', `Cancel submit issue`)
    window.FS.event('Canceled issue submission')
    this.props.onComplete()
  }

  fileIssue = async () => {
    this.props.onComplete()
    const {availableSessions, issueMessage, issueTitle} = this.state
    // Intentionally did not use redux/actions/resolvers for this
    const request = await createRequestObject();
    const payload = {
      fullstorySessions: availableSessions.filter(session => session.selected),
      component: {
        name: "clicker",
        id: "fsghfb-example-clicker"
      },
      title: issueTitle,
      message: issueMessage
    }

    const response = await request.post(path + '/submitIssue', payload).catch(err => {
      console.error(err.message)
    })

    if (response.error === undefined) {
      // console.log('Fle issue with github including link to session')
      window.FS.log('info', `Submitted issue to github - ID: ${response.data.githubIssueNumber}`)
      window.FS.event('issue submission', {
        githubIssueUrl: response.data.githubUrl
      })
      this.setState({
        availableSessions: [],
        issueMessage: "",
        issueTitle: "",
      })
      this.setState({
        confirmOpen: true,
        githubUrl: response.data.githubUrl,
        githubIssueId: response.data.githubIssueNumber
      })
    }
  }

  render() {
    const {isOpen, onComplete} = this.props
    const {availableSessions, issueMessage, issueTitle, confirmOpen, githubUrl, githubIssueId} = this.state
    return (
      <Layout>
        <Dialog
          title="Your issue has been received!"
          actions={[
            { onClick: this.cancel, text: 'Done' },
          ]}
          isOpen={confirmOpen}>
          <Text as="h4">
            You may follow the issue you just filed at <a href={githubUrl} rel="noopener noreferrer" target="_blank">Github Issue #{githubIssueId}</a>.
          </Text>
        </Dialog>
        <Dialog
          title="Tell us about the issue you are having"
          actions={[
            { onClick: this.cancel, text: 'Cancel' },
            { onClick: this.fileIssue, text: 'File Issue' }
          ]}
          isOpen={isOpen}
          onClose={onComplete}>
          <TextInput
            placeholder="Issue subject line"
            required
            value={issueTitle}
            onChange={this.handleChangeTitle}/>

          <TextArea
            placeholder="Please describe the issue"
            required
            value={issueMessage}
            onChange={this.handleChangeMessage}/>

          <Text as="h4">Roughly when did you observe this issue?</Text>
          {availableSessions && availableSessions.map((session, idx) => {
            return <Checkbox
                      onClick={() => this.toggleCheckBox(idx)}
                      key={idx}
                      name={'' + session.sessionId}
                      label={'' + session.deltaTime}
                      value={session.sessionUrl}
                      defaultChecked={session.selected} />
          })}
        </Dialog>
      </Layout>
    );
  }
}

export default Issue;
