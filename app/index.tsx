import ProgressBar from '@/components/ProgressBar';
import { getUserAgent } from '@/utils/userAgent';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { FileDownload } from 'react-native-webview/lib/WebViewTypes';

const Index = () => {
  const appName = Constants.expoConfig?.name ?? 'UnknownApp';
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const webViewRef = useRef<WebView>(null);
  const statusBarHeight = StatusBar.currentHeight || 0;
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Helper function to get MIME type from file extension
  const getMimeTypeFromExtension = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      rtf: 'application/rtf',
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      // Video
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',
      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',
      // Other
      apk: 'application/vnd.android.package-archive',
      exe: 'application/x-msdownload',
      dmg: 'application/x-apple-diskimage',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  // Helper function to get file extension from filename
  const getFileExtension = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    return ext || '';
  };

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

  const getFilePathName = (savedUri: string) => {
    const path = savedUri.split('/');
    const lastSegment = path[path.length - 1];
    // Decode URI encoding (%3A -> :, %2F -> /, etc.)
    const decodedPath = decodeURIComponent(lastSegment);
    // Remove "primary:" prefix and replace : with /
    const cleanPath = decodedPath.replace(/^primary:/, '').replace(/:/g, '/');
    return cleanPath;
  };

  // Function to open the file
  const openFile = async (fileUri: string, filename?: string, mimeType?: string) => {
    try {
      // Determine MIME type if not provided
      const finalMimeType =
        mimeType || (filename ? getMimeTypeFromExtension(filename) : 'application/octet-stream');
      console.log('📂 Opening file with MIME type:', finalMimeType);

      if (Platform.OS === 'android') {
        // On Android, use Linking to send an intent to open the file
        const canOpen = await Linking.canOpenURL(fileUri);
        if (canOpen) {
          await Linking.openURL(fileUri);
        } else {
          Alert.alert('Error', 'No app found to open this file type.');
        }
      } else {
        // On iOS, use shareAsync to open the file in a compatible app
        const ext = filename ? getFileExtension(filename) : '';
        await shareAsync(fileUri, {
          UTI: ext || finalMimeType.split('/')[1],
          mimeType: finalMimeType,
        });
      }
    } catch (error) {
      console.error('❌ Error opening file:', error);
      Alert.alert('Error', 'Unable to open the file. Please try again.');
    }
  };

  const downloadFile = async (url: string, filename?: string, mimeType?: string) => {
    console.log('📥 Downloading file from:', url);

    try {
      setIsDownloading(true);

      // Extract filename from URL or use a default name
      const finalFilename =
        filename || url.split('/').pop()?.split('?')[0] || 'download_' + Date.now();

      // Determine MIME type
      const finalMimeType = mimeType || getMimeTypeFromExtension(finalFilename);
      console.log('📄 File type detected:', finalMimeType, 'for filename:', finalFilename);

      let fileUri;
      if (Platform.OS === 'android') {
        // For Android, use StorageAccessFramework to save to Downloads
        fileUri = `${FileSystem.cacheDirectory}${finalFilename}`;
        const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
        const result = await downloadResumable.downloadAsync();

        if (result) {
          console.log('✅ File downloaded to cache:', result.uri);

          // Save to Downloads folder using StorageAccessFramework
          const permissions =
            await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const downloadsUri = permissions.directoryUri;
            const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(
              downloadsUri,
              finalFilename,
              finalMimeType
            );
            const fileContent = await FileSystem.readAsStringAsync(result.uri, {
              encoding: FileSystem.EncodingType.UTF8,
            });
            await FileSystem.StorageAccessFramework.writeAsStringAsync(savedUri, fileContent);
            console.log('✅ File saved to Downloads:', savedUri);
            Alert.alert('Success', `File saved to: ${getFilePathName(savedUri)}`, [
              { text: 'Open', onPress: () => openFile(savedUri, finalFilename, finalMimeType) },
              { text: 'OK', style: 'cancel' },
            ]);
          } else {
            console.log('⚠️ Permission to access Downloads folder denied');
            Alert.alert('Permission Denied', 'Cannot save to Downloads folder without permission.');
          }
        }
      } else {
        // For iOS, save to documentDirectory (iOS restricts direct Downloads folder access)
        fileUri = `${FileSystem.documentDirectory}${finalFilename}`;
        const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
        const result = await downloadResumable.downloadAsync();

        if (result) {
          console.log('✅ File saved to app directory:', result.uri);
          Alert.alert('Success', `File saved to: ${getFilePathName(result.uri)}`, [
            { text: 'Open', onPress: () => openFile(result.uri, finalFilename, finalMimeType) },
            { text: 'OK', style: 'cancel' },
          ]);
        }
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      Alert.alert('Download Failed', 'Unable to download the file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileDownload = async ({ nativeEvent }: { nativeEvent: FileDownload }) => {
    const { downloadUrl } = nativeEvent;
    console.log('📥 File download requested via onFileDownload:', downloadUrl);
    await downloadFile(downloadUrl);
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message from WebView:', data);

      if (data.type === 'download') {
        console.log('📥 Download triggered from JavaScript:', data.url);
        downloadFile(data.url, data.filename, data.mimeType);
      } else if (data.type === 'blob_processing') {
        console.log('⏳ Blob is being processed...');
        setIsDownloading(true);
      } else if (data.type === 'blob_data') {
        console.log('📦 Received blob data, saving file...');
        try {
          const finalFilename = data.filename || 'download_' + Date.now();
          const finalMimeType = data.mimeType || getMimeTypeFromExtension(finalFilename);
          let fileUri: string;

          if (Platform.OS === 'android') {
            // Save to Downloads folder using StorageAccessFramework
            fileUri = `${FileSystem.cacheDirectory}${finalFilename}`;
            await FileSystem.writeAsStringAsync(fileUri, data.data, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const permissions =
              await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const downloadsUri = permissions.directoryUri;
              const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(
                downloadsUri,
                finalFilename,
                finalMimeType
              );
              const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              await FileSystem.StorageAccessFramework.writeAsStringAsync(savedUri, fileContent);
              console.log('✅ File saved to Downloads:', savedUri);
              Alert.alert('Success', `File saved to: ${getFilePathName(savedUri)}`, [
                { text: 'Open', onPress: () => openFile(savedUri, finalFilename, finalMimeType) },
                { text: 'OK', style: 'cancel' },
              ]);
            } else {
              console.log('⚠️ Permission to access Downloads folder denied');
              Alert.alert(
                'Permission Denied',
                'Cannot save to Downloads folder without permission.'
              );
            }
          } else {
            // For iOS, save to documentDirectory
            fileUri = `${FileSystem.documentDirectory}${finalFilename}`;
            await FileSystem.writeAsStringAsync(fileUri, data.data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log('✅ File saved to app directory:', fileUri);
            Alert.alert('Success', `File saved to: ${getFilePathName(fileUri)}`, [
              { text: 'Open', onPress: () => openFile(fileUri, finalFilename, finalMimeType) },
              { text: 'OK', style: 'cancel' },
            ]);
          }
        } catch (error) {
          console.error('❌ Error saving blob file:', error);
          Alert.alert('Download Failed', 'Unable to save the file. Please try again.');
        } finally {
          setIsDownloading(false);
        }
      } else if (data.type === 'blob_error') {
        console.error('❌ Blob fetch error:', data.error);
        Alert.alert('Download Failed', 'Unable to fetch the file from the page.');
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error);
    }
  };

  // JavaScript to inject into the WebView to intercept downloads
  const injectedJavaScript = `
    (function() {
      console.log('🔧 Download interceptor script loaded');
      
      // Store blob objects created by the page
      const blobStore = new Map();
      
      // Override URL.createObjectURL to capture blobs
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = function(blob) {
        const url = originalCreateObjectURL.call(this, blob);
        console.log('🎯 Blob URL created, storing blob:', url);
        blobStore.set(url, blob);
        return url;
      };
      
      // Function to convert blob to base64 and send
      function sendBlobData(blob, filename) {
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64data = reader.result.split(',')[1];
          console.log('✅ Blob converted to base64, sending...');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'blob_data',
            data: base64data,
            filename: filename,
            mimeType: blob.type || 'application/octet-stream'
          }));
        };
        reader.onerror = function() {
          console.error('❌ Error reading blob');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'blob_error',
            error: 'Failed to read blob'
          }));
        };
        reader.readAsDataURL(blob);
      }
      
      // Function to fetch and send blob data
      async function fetchAndSendBlob(url, filename) {
        try {
          console.log('🔍 Checking blob store for:', url);
          
          // Notify React Native that we're processing
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'blob_processing'
          }));
          
          // First check if we have the blob stored
          if (blobStore.has(url)) {
            console.log('✅ Found blob in store, converting...');
            const blob = blobStore.get(url);
            sendBlobData(blob, filename);
            return;
          }
          
          // If not in store, try to fetch it
          console.log('🔍 Fetching blob from URL:', url);
          const response = await fetch(url);
          const blob = await response.blob();
          sendBlobData(blob, filename);
        } catch (error) {
          console.error('❌ Error fetching blob:', error);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'blob_error',
            error: error.message
          }));
        }
      }
      
      // Track clicks to intercept downloads after they're created
      let lastClickedElement = null;
      
      // Intercept clicks in capture phase to track the element
      document.addEventListener('click', function(e) {
        lastClickedElement = e.target;
        console.log('👆 Click detected on:', e.target.tagName);
      }, true);
      
      // Monitor when anchors get blob URLs set
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
            const target = mutation.target;
            if (target.tagName === 'A') {
              const href = target.getAttribute('href');
              const download = target.getAttribute('download');
              
              if (href && (href.startsWith('blob:') || href.startsWith('data:'))) {
                console.log('🎯 Blob URL detected on anchor:', href);
                
                // If this anchor was just clicked, intercept the download
                if (target === lastClickedElement || target.contains(lastClickedElement)) {
                  console.log('🎯 Intercepting blob download');
                  const filename = download || 'download_' + Date.now();
                  
                  // Delay slightly to ensure the blob is in our store
                  setTimeout(() => {
                    fetchAndSendBlob(href, filename);
                  }, 50);
                }
              }
            }
          }
        });
      });
      
      // Observe all anchor tags for attribute changes
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['href'],
        subtree: true
      });
      
      // Intercept anchor clicks with blob URLs
      document.addEventListener('click', function(e) {
        let target = e.target;
        
        // Traverse up to find an anchor element
        while (target && target !== document) {
          if (target.tagName === 'A') {
            const href = target.getAttribute('href');
            const download = target.getAttribute('download');
            
            // If it already has a blob URL, intercept it
            if (href && (href.startsWith('blob:') || href.startsWith('data:'))) {
              console.log('🎯 Blob download link clicked:', href);
              e.preventDefault();
              e.stopPropagation();
              
              const filename = download || 'download_' + Date.now();
              fetchAndSendBlob(href, filename);
              return false;
            }
            
            // If it has a download attribute but no href yet, wait for it
            if (download !== null && !href) {
              console.log('🎯 Download link clicked, waiting for href...');
              e.preventDefault();
              e.stopPropagation();
              
              // Check multiple times for the href to be set
              let checkCount = 0;
              const checkInterval = setInterval(() => {
                const currentHref = target.getAttribute('href');
                checkCount++;
                
                if (currentHref && (currentHref.startsWith('blob:') || currentHref.startsWith('data:'))) {
                  console.log('🎯 Href set to blob URL:', currentHref);
                  clearInterval(checkInterval);
                  const filename = download || 'download_' + Date.now();
                  fetchAndSendBlob(currentHref, filename);
                } else if (checkCount > 20) {
                  // Stop checking after 1 second (20 * 50ms)
                  console.log('⚠️ Timeout waiting for blob URL');
                  clearInterval(checkInterval);
                }
              }, 50);
              
              return false;
            }
            break;
          }
          target = target.parentElement;
        }
      }, false);
      
      // Intercept fetch and XMLHttpRequest for downloads
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (url.includes('download') || url.includes('export'))) {
          console.log('🎯 Fetch download detected:', url);
        }
        return originalFetch.apply(this, args);
      };
      
      // Override window.open for download popups
      const originalOpen = window.open;
      window.open = function(url, target, features) {
        console.log('🎯 Window.open called:', url);
        if (url && (url.includes('download') || url.includes('export') || url.startsWith('blob:') || url.startsWith('data:'))) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'download',
            url: url,
            filename: 'download_' + Date.now(),
            mimeType: undefined
          }));
          return null;
        }
        return originalOpen.apply(this, arguments);
      };
      
      console.log('✅ Download interceptor ready');
    })();
    true;
  `;

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
      {isDownloading && (
        <View style={styles.downloadingOverlay}>
          <View style={styles.downloadingCard}>
            <ActivityIndicator size="large" color="#0D8AF1" />
            <Text style={styles.downloadingText}>Downloading file...</Text>
          </View>
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
        injectedJavaScript={injectedJavaScript}
        onMessage={handleWebViewMessage}
        onFileDownload={handleFileDownload}
        onError={(error) => {
          console.log('❌ WebView error:', error);
        }}
        onHttpError={(error) => {
          console.log('❌ HTTP error:', error);
        }}
        onShouldStartLoadWithRequest={(request) => {
          console.log('🔗 WebView request:', request.url);

          // Intercept download URLs - check for common download patterns and file extensions
          const isDownloadUrl =
            request.url.includes('download') ||
            request.url.includes('/files/') ||
            request.url.includes('/exports/') ||
            request.url.startsWith('blob:') ||
            request.url.startsWith('data:') ||
            // Check for common file extensions
            /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|json|xml|rtf|jpg|jpeg|png|gif|bmp|webp|svg|mp3|mp4|avi|mov|wav|ogg|zip|rar|7z|tar|gz|apk|exe|dmg)(\?|$)/i.test(
              request.url
            );

          if (isDownloadUrl) {
            console.log('🎯 Download URL detected in request handler:', request.url);
            downloadFile(request.url);
            return false; // Prevent WebView from navigating
          }

          return true;
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
  downloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  downloadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    minWidth: 200,
  },
  downloadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
});

export default Index;
