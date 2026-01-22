import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react-native';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface ToastContextData {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextData>({
  showToast: () => { },
  hideToast: () => { },
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');

  // Animation values
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string, t: ToastType = 'success', duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setMessage(msg);
    setType(t);
    setVisible(true);

    // Animate In
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();

    // Auto Hide
    timerRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setVisible(false);
    });
  };

  const getColors = () => {
    switch (type) {
      case 'success': return { bg: '#059669', icon: '#fff', text: '#fff' }; // Emerald 600
      case 'error': return { bg: '#DC2626', icon: '#fff', text: '#fff' };   // Red 600
      case 'info': return { bg: '#2563EB', icon: '#fff', text: '#fff' };    // Blue 600
      default: return { bg: '#0f172a', icon: '#fff', text: '#fff' };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={24} color="#fff" />;
      case 'error': return <AlertCircle size={24} color="#fff" />;
      default: return <Info size={24} color="#fff" />;
    }
  };

  const { bg, text } = getColors();

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              backgroundColor: bg,
              transform: [{ translateY }],
              opacity
            }
          ]}
        >
          <View style={styles.content}>
            {getIcon()}
            <Text style={[styles.message, { color: text }]}>{message}</Text>
          </View>
          <TouchableOpacity onPress={hideToast}>
            <X size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 9999,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  }
});