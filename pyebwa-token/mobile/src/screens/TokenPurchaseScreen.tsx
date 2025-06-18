import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface Transaction {
  id: string;
  tokens: number;
  price: number;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
}

export const TokenPurchaseScreen: React.FC = () => {
  const { t } = useTranslation();
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(100); // Demo balance
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('card');

  const tokenPackages: TokenPackage[] = [
    {
      id: 'starter',
      tokens: 100,
      price: 0.99,
    },
    {
      id: 'basic',
      tokens: 500,
      price: 4.49,
      bonus: 50,
    },
    {
      id: 'popular',
      tokens: 1000,
      price: 7.99,
      bonus: 200,
      popular: true,
    },
    {
      id: 'premium',
      tokens: 5000,
      price: 34.99,
      bonus: 1500,
    },
  ];

  const paymentMethods = [
    { id: 'card', name: t('purchase.paymentMethods.creditCard'), icon: 'card' },
    { id: 'paypal', name: 'PayPal', icon: 'logo-paypal' },
    { id: 'mobile', name: t('purchase.paymentMethods.mobileMoney'), icon: 'phone-portrait' },
  ];

  const handleSelectPackage = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create transaction record
      const transaction: Transaction = {
        id: `txn_${Date.now()}`,
        tokens: selectedPackage.tokens + (selectedPackage.bonus || 0),
        price: selectedPackage.price,
        date: new Date(),
        status: 'completed',
        paymentMethod: selectedPaymentMethod,
      };

      // Update balance
      const newBalance = currentBalance + transaction.tokens;
      setCurrentBalance(newBalance);
      await AsyncStorage.setItem('tokenBalance', newBalance.toString());

      // Save transaction
      const updatedTransactions = [...transactions, transaction];
      setTransactions(updatedTransactions);
      await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));

      // Show success
      Alert.alert(
        t('common.success'),
        t('purchase.successMessage', { 
          tokens: transaction.tokens,
          price: selectedPackage.price.toFixed(2)
        }),
        [{ text: 'OK', onPress: () => setShowPaymentModal(false) }]
      );
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(t('common.error'), t('purchase.paymentError'));
    } finally {
      setIsProcessing(false);
    }
  };

  const getTotalTokens = (pkg: TokenPackage) => {
    return pkg.tokens + (pkg.bonus || 0);
  };

  const getPricePerToken = (pkg: TokenPackage) => {
    return (pkg.price / getTotalTokens(pkg)).toFixed(4);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('purchase.currentBalance')}</Text>
          <Text style={styles.balanceAmount}>{currentBalance.toLocaleString()}</Text>
          <Text style={styles.balanceUnit}>PYEBWA</Text>
          <Text style={styles.balanceValue}>≈ ${(currentBalance * 0.001).toFixed(2)} USD</Text>
        </View>

        {/* Token Packages */}
        <Text style={styles.sectionTitle}>{t('purchase.selectPackage')}</Text>
        
        <View style={styles.packagesContainer}>
          {tokenPackages.map(pkg => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.packageCard,
                pkg.popular && styles.popularPackage
              ]}
              onPress={() => handleSelectPackage(pkg)}
            >
              {pkg.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>{t('purchase.mostPopular')}</Text>
                </View>
              )}
              
              <Text style={styles.tokenAmount}>{pkg.tokens.toLocaleString()}</Text>
              <Text style={styles.tokenLabel}>PYEBWA</Text>
              
              {pkg.bonus && (
                <View style={styles.bonusContainer}>
                  <Text style={styles.bonusText}>+{pkg.bonus} {t('purchase.bonus')}</Text>
                </View>
              )}
              
              <View style={styles.priceContainer}>
                <Text style={styles.price}>${pkg.price.toFixed(2)}</Text>
                <Text style={styles.pricePerToken}>
                  ${getPricePerToken(pkg)}/{t('purchase.token')}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyButtonText}>{t('purchase.buy')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>{t('purchase.whyBuyTokens')}</Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="leaf" size={24} color="#4CAF50" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{t('purchase.benefits.environment.title')}</Text>
              <Text style={styles.benefitDescription}>{t('purchase.benefits.environment.description')}</Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="people" size={24} color="#00217D" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{t('purchase.benefits.heritage.title')}</Text>
              <Text style={styles.benefitDescription}>{t('purchase.benefits.heritage.description')}</Text>
            </View>
          </View>
          
          <View style={styles.benefitItem}>
            <Ionicons name="trending-up" size={24} color="#D41125" />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{t('purchase.benefits.value.title')}</Text>
              <Text style={styles.benefitDescription}>{t('purchase.benefits.value.description')}</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        {transactions.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>{t('purchase.recentTransactions')}</Text>
            {transactions.slice(-3).reverse().map(txn => (
              <View key={txn.id} style={styles.transactionItem}>
                <View>
                  <Text style={styles.txnTokens}>+{txn.tokens} PYEBWA</Text>
                  <Text style={styles.txnDate}>
                    {new Date(txn.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.txnPrice}>${txn.price.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('purchase.completePayment')}</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedPackage && (
              <>
                <View style={styles.orderSummary}>
                  <Text style={styles.summaryTitle}>{t('purchase.orderSummary')}</Text>
                  <View style={styles.summaryRow}>
                    <Text>{getTotalTokens(selectedPackage)} PYEBWA</Text>
                    <Text style={styles.summaryPrice}>${selectedPackage.price.toFixed(2)}</Text>
                  </View>
                </View>

                <Text style={styles.paymentMethodLabel}>{t('purchase.paymentMethod')}</Text>
                {paymentMethods.map(method => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodItem,
                      selectedPaymentMethod === method.id && styles.selectedPaymentMethod
                    ]}
                    onPress={() => setSelectedPaymentMethod(method.id)}
                  >
                    <Ionicons name={method.icon as any} size={24} color="#00217D" />
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    {selectedPaymentMethod === method.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.confirmButton, isProcessing && styles.processingButton]}
                  onPress={processPayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>
                      {t('purchase.confirmPayment', { amount: selectedPackage.price.toFixed(2) })}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.secureText}>
                  <Ionicons name="lock-closed" size={16} color="#666" /> {t('purchase.securePayment')}
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  balanceCard: {
    backgroundColor: '#00217D',
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 10,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  balanceUnit: {
    color: 'white',
    fontSize: 20,
    marginTop: 5,
  },
  balanceValue: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  packagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  packageCard: {
    backgroundColor: 'white',
    width: '48%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  popularPackage: {
    borderColor: '#4CAF50',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tokenAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00217D',
    marginTop: 10,
  },
  tokenLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  bonusContainer: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  bonusText: {
    color: '#F57C00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  pricePerToken: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: '#00217D',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  benefitsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  benefitText: {
    flex: 1,
    marginLeft: 15,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  historySection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  txnTokens: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  txnDate: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  txnPrice: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  orderSummary: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00217D',
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedPaymentMethod: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8ff',
  },
  paymentMethodName: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  processingButton: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secureText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 15,
  },
});