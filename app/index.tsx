import ProgressBar from '@/components/ProgressBar';
import { getUserAgent } from '@/utils/userAgent';
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const Index = () => {
  const appName = Constants.expoConfig?.name ?? 'UnknownApp';
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const webViewRef = useRef<WebView>(null);
  const statusBarHeight = StatusBar.currentHeight || 0;
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, []);

  const handleReload = () => {
    if (webViewRef.current) {
      setLoadingProgress(0);
      setIsLoading(true);
      webViewRef.current.reload();
    }
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={[styles.progressContainer, { top: statusBarHeight }]}>
          <ProgressBar
            progress={loadingProgress}
            height={3}
            backgroundColor="rgba(255, 255, 255, 0.2)"
            progressColor="#FFFFFF"
          />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: 'http://192.168.4.1' }}
        style={[styles.webview, { marginTop: statusBarHeight }]}
        startInLoadingState={true}
        scalesPageToFit={true}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsBackForwardNavigationGestures={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsProtectedMedia={true}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        userAgent={getUserAgent()}
        onError={(error) => {
          console.log('❌ WebView error:', error);
        }}
        onHttpError={(error) => {
          console.log('❌ HTTP error:', error);
        }}
        onLoadStart={() => {
          console.log('🔄 WebView loading started');
          setIsLoading(true);
          setLoadingProgress(0);
        }}
        onLoadEnd={() => {
          console.log('✅ WebView loading finished');
          setLoadingProgress(1);
          setTimeout(() => setIsLoading(false), 300);
        }}
        onLoadProgress={(event) => {
          const progress = event.nativeEvent.progress;
          console.log(`📊 WebView load progress: ${progress * 100}%`);
          setLoadingProgress(progress);
        }}
        renderError={() => (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Error loading page, please try again.</Text>
            <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
              <Text style={styles.reloadButtonText}>Reload</Text>
            </TouchableOpacity>
          </View>
        )}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
            <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingIndicator} />
            <Text style={styles.loadingText}>
              {appName} v{appVersion}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: '#0D8AF1',
  },
  progressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 0,
  },
  webview: {},
  loadingContainer: {
    height: '100%',
    backgroundColor: '#0D8AF1',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingIndicator: {
    width: 50,
    height: 50,
  },
  reloadButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Index;
