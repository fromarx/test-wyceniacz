import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export async function presentPaywall(): Promise<boolean> {
  try {
    const result = await RevenueCatUI.presentPaywall();

    return (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    );
  } catch (e) {
    console.error('Paywall error:', e);
    return false;
  }
}
