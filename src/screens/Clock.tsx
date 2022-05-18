/* eslint-disable prettier/prettier */
/* eslint-disable react/style-prop-object */
/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable camelcase */
import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLoading from 'expo-app-loading';
import { useFonts, Inter_700Bold } from '@expo-google-fonts/inter';
import { StackNavigationProp } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { DeviceMotion } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';


import { BaseOptions, StackParamList } from '../../App';

// Time resolution in ms
const timeResolution = 100;

// Min delta angle required to change the player state
const minDeltaAngle = 1;

DeviceMotion.setUpdateInterval(timeResolution);

let topOrLeftStartTime = 0;
let bottomOrRightStartTime = 0;

let topOrLeftCorrectionTime = 0;
let bottomOrRightCorrectionTime = 0;

// Last rotation angle
let lastAngle = 0;

export function usePrevious(value?: BaseOptions): BaseOptions | undefined {
  const ref = React.useRef<BaseOptions | undefined>();
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

type ClockScreenNavigationProp = StackNavigationProp<StackParamList, 'Clock'>;

type Props = {
  navigation: ClockScreenNavigationProp;
  activeMode: BaseOptions;
};

export default function Clock({ navigation, activeMode }: Props): JSX.Element {
  type Player = {
    steps: number;
    timeLeft: number;
    paused: boolean;
    increment: number;
  };

  type PlayerSide = 'left' | 'right' | 'idle';
  type StateGame = 'play' | 'pause' | 'idle';

  const [fontsLoaded] = useFonts({
    Inter_700Bold,
  });

  const activeModePrevius = usePrevious(activeMode);

  const { timeLeft, increment } = activeMode;

  const initialState = {
    steps: 0,
    timeLeft,
    increment,
    paused: true,
  };

  const [player, setPlayer] = React.useState<PlayerSide>('idle');

  const [playerTopOrLeft, setPlayerTopOrLeft] = React.useState<Player>(
    initialState
  );

  const [playerBottomOrRight, setPlayerBottomOrRight] = React.useState<Player>(
    initialState
  );

  const [gameOver, setGameOver] = React.useState<boolean>(false);
  const [ready, setReady] = React.useState<StateGame>('idle');

  const startplayerBottomOrRight = useCallback(() => {
    if (!playerTopOrLeft.paused && playerTopOrLeft.steps > 0) return;
    setPlayerTopOrLeft({
      ...playerTopOrLeft,
      paused: false,
      steps: playerTopOrLeft.steps + 1,
    });
    const increment =
      playerBottomOrRight.timeLeft < timeResolution ? 0 : playerBottomOrRight.increment;
    setPlayerBottomOrRight({
      ...playerBottomOrRight,
      paused: true,
      timeLeft:
        playerBottomOrRight.steps === 0
          ? playerBottomOrRight.timeLeft
          : playerBottomOrRight.timeLeft + increment,
    });
  }, [playerBottomOrRight, playerTopOrLeft]);

  const startPlayerTopOrLeft = useCallback(() => {
    if (!playerBottomOrRight.paused && playerBottomOrRight.steps > 0) return;
    setPlayerBottomOrRight({
      ...playerBottomOrRight,
      paused: false,
      steps: playerBottomOrRight.steps + 1,
    });
    const increment =
      playerTopOrLeft.timeLeft < timeResolution ? 0 : playerTopOrLeft.increment;
    setPlayerTopOrLeft({
      ...playerTopOrLeft,
      paused: true,
      timeLeft:
        playerTopOrLeft.steps === 0
          ? playerTopOrLeft.timeLeft
          : playerTopOrLeft.timeLeft + increment,
    });
  }, [playerBottomOrRight, playerTopOrLeft]);

  const reset = () => {
    setPlayerBottomOrRight(initialState);
    setPlayerTopOrLeft(initialState);
    setGameOver(false);
    setReady('idle');
  };

  const formatterTime = (time: number) => {
    const size = time < 60000 ? 7 : 5;
    return new Date(time).toISOString().substr(14, size);
  }


  React.useEffect(() => {
    topOrLeftStartTime = new Date().getTime();
    const id = setInterval(() => {
      const delta = timeResolution + topOrLeftCorrectionTime;
      const timeLeft = playerTopOrLeft.timeLeft - delta;
      setPlayerTopOrLeft({
        ...playerTopOrLeft,
        timeLeft: timeLeft < timeResolution ? 0 : timeLeft,
      });
      const end = new Date().getTime() - topOrLeftStartTime;
      topOrLeftCorrectionTime = end - timeResolution;
    }, timeResolution);
    if (playerTopOrLeft.timeLeft === 0) {
      clearInterval(id);
      setGameOver(true);
    }
    if (playerTopOrLeft.paused || ready !== 'play' || gameOver) {
      clearInterval(id);
    }

    return () => clearInterval(id);
  }, [playerTopOrLeft, playerTopOrLeft.paused, ready, gameOver]);

  React.useEffect(() => {
    bottomOrRightStartTime = new Date().getTime();
    const id = setInterval(() => {
      const delta = timeResolution + bottomOrRightCorrectionTime;
      const timeLeft = playerBottomOrRight.timeLeft - delta;
      setPlayerBottomOrRight({
        ...playerBottomOrRight,
        timeLeft: timeLeft < timeResolution ? 0 : timeLeft,
      });
      const end = new Date().getTime() - bottomOrRightStartTime;
      bottomOrRightCorrectionTime = end - timeResolution;
    }, timeResolution);
    if (playerBottomOrRight.timeLeft === 0) {
      clearInterval(id);
      setGameOver(true);
    }
    if (playerBottomOrRight.paused || ready !== 'play' || gameOver) {
      clearInterval(id);
    }

    return () => clearInterval(id);
  }, [playerBottomOrRight, playerBottomOrRight.paused, ready, gameOver]);

  React.useEffect(() => {
    if (activeModePrevius !== activeMode) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  React.useEffect(() => {
    const listener = DeviceMotion.addListener(
      async ({ rotation }) => {
        // get actual rotation in degrees
        const beta = rotation?.beta || 0;
        const orientation = await ScreenOrientation.getOrientationAsync();
        const rotAngle = orientation === 4 ? beta * (180 / Math.PI) : -beta * (180 / Math.PI);

        const deltaAngle = rotAngle - lastAngle;
        if (Math.abs(rotAngle - lastAngle) > minDeltaAngle) {
          const state =
            deltaAngle > 0 ? 'left' : deltaAngle < 0 ? 'right' : 'idle';
          setPlayer((prevState) => {
            if (prevState !== state) return state;
            return prevState;
          });
        };
        lastAngle = rotAngle;
      }
    );
    return () => listener.remove();
  }, []);


  React.useEffect(() => {
    if (ready === 'play' && !gameOver) {
      if (player === 'left') startplayerBottomOrRight();
      if (player === 'right') startPlayerTopOrLeft();
    }
  }, [player, startPlayerTopOrLeft, startplayerBottomOrRight, ready, gameOver]);


  if (!fontsLoaded) {
    return <AppLoading />;
  }

  const backgroundColor = playerTopOrLeft.timeLeft === 0
    ? 'red'
    : playerTopOrLeft.paused
      ? '#c0c0c0'
      : 'darkorange';

  return (
    <>
      <SafeAreaView />
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', flex: 1 }}>
          <View
            style={[
              styles.touchView, { backgroundColor },
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: playerTopOrLeft.paused ? '#000' : '#c0c0c0',
                },
              ]}
            >
              {formatterTime(playerTopOrLeft.timeLeft)}
            </Text>
            <Text style={{ position: 'absolute', top: 15, left: 15 }}>
              {playerTopOrLeft.steps}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'column',
              padding: 20,
              backgroundColor: '#333',
              justifyContent: 'space-around',
              alignItems: 'center'
            }}
          >
            <TouchableOpacity onPress={reset}>
              <Ionicons
                name="reload"
                size={32}
                color="#c0c0c0"
              />
            </TouchableOpacity>
            {ready !== 'play' && (
              <TouchableOpacity onPress={() => setReady('play')}>
                <Ionicons
                  name="play"
                  size={32}
                  color="#c0c0c0"
                />
              </TouchableOpacity>
            )}
            {ready === 'play' && (
              <TouchableOpacity onPress={() => setReady('pause')}>
                <Ionicons
                  name="pause"
                  size={32}
                  color="#c0c0c0"
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons
                name="settings"
                size={32}
                color="#c0c0c0"
              />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.touchView,
              {
                backgroundColor:
                  playerBottomOrRight.timeLeft === 0
                    ? 'red'
                    : playerBottomOrRight.paused
                      ? '#c0c0c0'
                      : 'darkorange',
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: playerBottomOrRight.paused ? '#000' : '#c0c0c0',
                },
              ]}
            >
              {formatterTime(playerBottomOrRight.timeLeft)}
            </Text>
            <Text style={{ position: 'absolute', left: 15, top: 15 }}>
              {playerBottomOrRight.steps}
            </Text>
          </View>
        </View>
      </View>
      <StatusBar hidden={true} style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  text: {
    fontSize: 70,
    fontFamily: 'Inter_700Bold',
  },
  touchView: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
