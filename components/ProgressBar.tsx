import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProgressBarProps {
  progress: number;
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 4,
  backgroundColor = 'rgba(255, 255, 255, 0.3)',
  progressColor = '#FFFFFF',
}) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const width = `${clampedProgress * 100}%` as const;

  return (
    <View style={[styles.container, { height, backgroundColor }]}>
      <View style={[styles.progress, { backgroundColor: progressColor, width }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 2,
  },
});

export default ProgressBar;
