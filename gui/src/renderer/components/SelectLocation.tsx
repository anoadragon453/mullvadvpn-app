import * as React from 'react';
import ReactDOM from 'react-dom';
import { Component, View } from 'reactxp';
import { LiftedConstraint, RelayLocation } from '../../shared/daemon-rpc-types';
import { messages } from '../../shared/gettext';
import { IRelayLocationRedux } from '../redux/settings/reducers';
import { LocationScope } from '../redux/userinterface/reducers';
import BridgeLocations, { SpecialBridgeLocationType } from './BridgeLocations';
import CustomScrollbars from './CustomScrollbars';
import ExitLocations from './ExitLocations';
import { Container, Layout } from './Layout';
import LocationList, { LocationSelection, LocationSelectionType } from './LocationList';
import {
  CloseBarItem,
  NavigationBar,
  NavigationContainer,
  NavigationItems,
  NavigationScrollbars,
  ScopeBar,
  ScopeBarItem,
  TitleBarItem,
} from './NavigationBar';
import styles from './SelectLocationStyles';
import { HeaderSubTitle } from './SettingsHeader';

interface IProps {
  locationScope: LocationScope;
  selectedExitLocation?: RelayLocation;
  selectedBridgeLocation?: LiftedConstraint<RelayLocation>;
  relayLocations: IRelayLocationRedux[];
  bridgeLocations: IRelayLocationRedux[];
  allowBridgeSelection: boolean;
  onClose: () => void;
  onChangeLocationScope: (location: LocationScope) => void;
  onSelectExitLocation: (location: RelayLocation) => void;
  onSelectBridgeLocation: (location: RelayLocation) => void;
  onSelectClosestToExit: () => void;
}

interface ISelectLocationSnapshot {
  scrollPosition: [number, number];
  expandedLocations: RelayLocation[];
}

export default class SelectLocation extends Component<IProps> {
  private scrollView = React.createRef<CustomScrollbars>();
  private selectedExitLocationRef = React.createRef<React.ReactInstance>();
  private selectedBridgeLocationRef = React.createRef<React.ReactInstance>();

  private exitLocationList = React.createRef<LocationList<never>>();
  private bridgeLocationList = React.createRef<LocationList<SpecialBridgeLocationType>>();

  private snapshotByScope: { [index: number]: ISelectLocationSnapshot } = {};

  public componentDidMount() {
    this.scrollToSelectedCell();
  }

  public componentDidUpdate(prevProps: IProps, _prevState: {}, snapshot?: ISelectLocationSnapshot) {
    if (this.props.locationScope !== prevProps.locationScope) {
      this.restoreScrollPosition(this.props.locationScope);

      if (snapshot) {
        this.snapshotByScope[prevProps.locationScope] = snapshot;
      }
    }
  }

  public getSnapshotBeforeUpdate(prevProps: IProps): ISelectLocationSnapshot | undefined {
    const scrollView = this.scrollView.current;
    const locationList =
      prevProps.locationScope === LocationScope.relay
        ? this.exitLocationList.current
        : this.bridgeLocationList.current;

    if (scrollView && locationList) {
      return {
        scrollPosition: scrollView.getScrollPosition(),
        expandedLocations: locationList.getExpandedLocations(),
      };
    } else {
      return undefined;
    }
  }

  public render() {
    return (
      <Layout>
        <Container>
          <View style={styles.select_location}>
            <NavigationContainer>
              <NavigationBar alwaysDisplayBarTitle={true}>
                <NavigationItems>
                  <CloseBarItem action={this.props.onClose} />
                  <TitleBarItem>
                    {
                      // TRANSLATORS: Title label in navigation bar
                      messages.pgettext('select-location-nav', 'Select location')
                    }
                  </TitleBarItem>
                </NavigationItems>
                <View style={styles.navigationBarAttachment}>
                  <HeaderSubTitle>
                    {this.props.allowBridgeSelection
                      ? messages.pgettext(
                          'select-location-view',
                          'While connected, your traffic will be routed through two secure locations, the entry point (a bridge server) and the exit point (a VPN server).',
                        )
                      : messages.pgettext(
                          'select-location-view',
                          'While connected, your real location is masked with a private and secure location in the selected region.',
                        )}
                  </HeaderSubTitle>
                  {this.props.allowBridgeSelection && (
                    <ScopeBar
                      style={styles.scopeBar}
                      defaultSelectedIndex={this.props.locationScope}
                      onChange={this.props.onChangeLocationScope}>
                      <ScopeBarItem>
                        {messages.pgettext('select-location-nav', 'Entry')}
                      </ScopeBarItem>
                      <ScopeBarItem>
                        {messages.pgettext('select-location-nav', 'Exit')}
                      </ScopeBarItem>
                    </ScopeBar>
                  )}
                </View>
              </NavigationBar>
              <View style={styles.container}>
                <NavigationScrollbars ref={this.scrollView}>
                  <View style={styles.content}>
                    {this.props.locationScope === LocationScope.relay ? (
                      <ExitLocations
                        ref={this.exitLocationList}
                        source={this.props.relayLocations}
                        defaultExpandedLocations={this.getExpandedLocationsFromSnapshot()}
                        selectedValue={this.props.selectedExitLocation}
                        selectedElementRef={this.selectedExitLocationRef}
                        onSelect={this.onSelectExitLocation}
                        cb={this.cb}
                      />
                    ) : (
                      <BridgeLocations
                        ref={this.bridgeLocationList}
                        source={this.props.bridgeLocations}
                        defaultExpandedLocations={this.getExpandedLocationsFromSnapshot()}
                        selectedValue={this.props.selectedBridgeLocation}
                        selectedElementRef={this.selectedBridgeLocationRef}
                        onSelect={this.onSelectBridgeLocation}
                        cb={this.cb}
                      />
                    )}
                  </View>
                </NavigationScrollbars>
              </View>
            </NavigationContainer>
          </View>
        </Container>
      </Layout>
    );
  }

  public restoreScrollPosition(scope: LocationScope) {
    const snapshot = this.snapshotByScope[scope];

    if (snapshot) {
      this.scrollToPosition(...snapshot.scrollPosition);
    } else {
      this.scrollToSelectedCell();
    }
  }

  private getExpandedLocationsFromSnapshot(): RelayLocation[] | undefined {
    const snapshot = this.snapshotByScope[this.props.locationScope];
    if (snapshot) {
      return snapshot.expandedLocations;
    } else {
      return undefined;
    }
  }

  private scrollToPosition(x: number, y: number) {
    this.scrollView.current?.scrollTo(x, y);
  }

  private scrollToSelectedCell() {
    const ref =
      this.props.locationScope === LocationScope.relay
        ? this.selectedExitLocationRef.current
        : this.selectedBridgeLocationRef.current;
    const scrollView = this.scrollView.current;

    if (scrollView) {
      if (ref) {
        const cellDOMNode = ReactDOM.findDOMNode(ref);
        if (cellDOMNode instanceof HTMLElement) {
          scrollView.scrollToElement(cellDOMNode, 'middle');
        }
      } else {
        scrollView.scrollToTop();
      }
    }
  }

  private cb = (...[content, button]: any[]) => {
    const contentHeight = content.offsetHeight;
    const buttonHeight = button.offsetHeight;
    // @ts-ignore
    const scrollOffsetTop = this.scrollView.current!.scrollableRef.current!.getBoundingClientRect().y;
    const buttonTop = button.getBoundingClientRect().y - scrollOffsetTop;
    // @ts-ignore
    const scrollTop = this.scrollView.current!.scrollableRef.current!.scrollTop;
    // @ts-ignore
    const scrollStart = this.scrollView.current!.scrollableRef.current!.scrollHeight;
    // @ts-ignore
    const scrollOffsetHeight = this.scrollView.current!.scrollableRef.current!.offsetHeight;
    const scrollEnd = scrollStart + scrollOffsetHeight;

    if (buttonTop + buttonHeight + contentHeight > scrollOffsetHeight) {
      // @ts-ignore
      this.scrollView.current!.scrollableRef.current!.style.paddingBottom = contentHeight + 'px';
      setTimeout(() => {
        // @ts-ignore
        this.scrollView.current!.scrollableRef.current!.style.paddingBottom = 0;
      }, 350);

      const toBottom = scrollStart + buttonTop + buttonHeight + contentHeight - scrollEnd;
      setTimeout(() => {
        // @ts-ignore
        this.scrollView.current!.scrollableRef.current!.scrollBy({
          top: Math.min(toBottom, buttonTop),
          behavior: 'smooth' },
        );
      });
    }
  };

  private onSelectExitLocation = (location: LocationSelection<never>) => {
    if (location.type === LocationSelectionType.relay) {
      this.props.onSelectExitLocation(location.value);
    }
  };

  private onSelectBridgeLocation = (location: LocationSelection<SpecialBridgeLocationType>) => {
    if (location.type === LocationSelectionType.relay) {
      this.props.onSelectBridgeLocation(location.value);
    } else if (
      location.type === LocationSelectionType.special &&
      location.value === SpecialBridgeLocationType.closestToExit
    ) {
      this.props.onSelectClosestToExit();
    }
  };
}
