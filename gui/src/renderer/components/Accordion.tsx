import React, { Suspense } from 'react';
import styled from 'styled-components';

interface IProps {
  expanded: boolean;
  animationDuration: number;
  onTransitionEnd?: (event: React.TransitionEvent) => void;
  children?: React.ReactNode;
}

interface IState {
  containerHeight: string;
}

const Container = styled.div((props: { height: string; animationDuration: number }) => ({
  display: 'flex',
  height: props.height,
  overflow: 'hidden',
  transition: `height ${props.animationDuration}ms ease-in-out`,
}));

const Content = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: 'fit-content',
});

export default class Accordion extends React.Component<IProps, IState> {
  private containerRef = React.createRef<HTMLDivElement>();

  public static defaultProps = {
    expanded: true,
    animationDuration: 350,
  };

  public state: IState = {
    containerHeight: this.props.expanded ? 'auto' : '0',
  };

  public componentDidUpdate(oldProps: IProps) {
    if (this.props.expanded && !oldProps.expanded) {
      this.expand();
    } else if (!this.props.expanded && oldProps.expanded) {
      this.collapse();
    }
  }

  public render() {
    return (
      <Container
        ref={this.containerRef}
        height={this.state.containerHeight}
        animationDuration={this.props.animationDuration}
        onTransitionEnd={this.onTransitionEnd}>
        <Content>
          <Suspense fallback={() => null}>{this.props.children}</Suspense>
        </Content>
      </Container>
    );
  }

  private expand() {
    this.setState({ containerHeight: this.getContentHeight() });
  }

  private collapse() {
    // First change height to height in px since it's not possible to transition to/from auto
    this.setState({ containerHeight: this.getContentHeight() }, () => {
      // Make sure new height has been applied
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this.containerRef.current?.offsetHeight;
      this.setState({ containerHeight: '0' });
    });
  }

  private getContentHeight(): string {
    return (this.containerRef.current?.scrollHeight ?? 0) + 'px';
  }

  private onTransitionEnd = (event: React.TransitionEvent) => {
    if (this.props.expanded) {
      // Height auto enables the container to grow if the content changes size
      this.setState({ containerHeight: 'auto' });
    }

    this.props.onTransitionEnd?.(event);
  };
}
