import React, { Component } from 'react'
import Button from 'mineral-ui/Button'
import Flex, { FlexItem } from 'mineral-ui/Flex'
import Layout from '../layout'
import Issue from '../issues'

class Clicker extends Component {

  constructor(props) {
    super(props)

    this.state = {
      user: props.user,
      counter: 0,
      dialogVisible: false
    }
    this.handlePlus = this.handlePlus.bind(this)
    this.handleMinus = this.handleMinus.bind(this)
  }

  handlePlus = () => {
    let {counter} = this.state
    this.setState({counter: counter+=1}, () => {
      window.FS.log('info', `Increment Counter`)
      window.FS.event('Increment Counter', {
        counter
      })
    })
  }

  handleMinus = () => {
    let {counter} = this.state
    this.setState({counter: counter-=1}, () => {
      window.FS.log('info', `Decrement Counter`)
      window.FS.event('Dectement Counter', {
        counter
      })
    })
  }

  handleIssueFile = () => {
    if (!this.state.dialogVisible) {
      this.setState({dialogVisible: true}, () => {
        window.FS.event('Issue Dialog Activated')
      })
    }
  }

  hideDialog = () => {
    this.setState({dialogVisible: false}, () => {
      window.FS.event('Issue Dialog Deactivated')
    })
  }
  render() {
    const plus = this.handlePlus
    const minus = this.handleMinus
    const {user, counter} = this.state
    return (
      <Layout>
        <Flex>
          <FlexItem grow={1}>{counter}</FlexItem>
        </Flex>
        <Flex>
          <FlexItem>
            <Button primary onClick={plus}>Plus</Button>
          </FlexItem>
          <FlexItem>
            <Button variant="danger" primary onClick={minus}>Minus</Button>
          </FlexItem>
          <FlexItem>
            <Button primary disabled={user!==null} onClick={() => this.handleIssueFile()}>File An Issue</Button>
          </FlexItem>
        </Flex>
        <Issue isOpen={this.state.dialogVisible} onComplete={this.hideDialog} />
      </Layout>
    );
  }
}

export default Clicker;
