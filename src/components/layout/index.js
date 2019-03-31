import React from 'react'
import styled from '@emotion/styled'

const Root = styled('div')(
  ({ includeLastChild, marginRight, marginBottom }) => {
    if (includeLastChild) {
      return {
        '&[class] > *': {
          marginRight,
          marginBottom
        }
      };
    } else {
      return {
        '&[class] > *:not(:last-child)': {
          marginRight,
          marginBottom
        }
      };
    }
  }
);

const DemoLayout = (props) => (
  <Root marginBottom="1rem" {...props} />
);

export default DemoLayout;