import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const NotificationPrompt = ({ onClose }) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    
    const requestNotificationPermission = async () => {
        try {
            setLoading(true);
            
            // Request permission
            const authStatus = await messaging().requestPermission();
            const enabled = 
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            
            if (enabled) {
                console.log('Notification permission granted');
                
                // Get FCM token
                const token = await messaging().getToken();
                console.log('FCM Token:', token);
                
                // Save token to Firestore
                const user = auth().currentUser;
                if (user && token) {
                    await firestore()
                        .collection('users')
                        .doc(user.uid)
                        .update({
                            fcmTokens: firestore.FieldValue.arrayUnion(token),
                            lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
                            notificationsEnabled: true
                        });
                }
                
                // Save preference
                await AsyncStorage.setItem('notificationsEnabled', 'true');
                await AsyncStorage.setItem('notificationPromptShown', 'true');
                
                Alert.alert(
                    'Success!',
                    'Push notifications enabled. You\'ll receive important updates and announcements.',
                    [{ text: 'OK', onPress: onClose }]
                );
            } else {
                Alert.alert(
                    'Permission Denied',
                    'You can enable notifications later in your device settings.',
                    [{ text: 'OK', onPress: onClose }]
                );
            }
        } catch (error) {
            console.error('Error requesting notifications:', error);
            Alert.alert(
                'Error',
                'Failed to enable notifications. Please try again later.',
                [{ text: 'OK', onPress: onClose }]
            );
        } finally {
            setLoading(false);
        }
    };
    
    const skipNotifications = async () => {
        await AsyncStorage.setItem('notificationPromptShown', 'true');
        onClose();
    };
    
    return (
        <View style={styles.container}>
            <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.iconContainer}>
                    <Icon name="notifications" size={60} color={theme.colors.primary} />
                </View>
                
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                    Stay Connected
                </Text>
                
                <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                    Enable push notifications to receive important family updates, 
                    announcements, and reminders about family events.
                </Text>
                
                <View style={styles.features}>
                    <View style={styles.featureItem}>
                        <Icon name="campaign" size={24} color={theme.colors.primary} />
                        <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
                            Family announcements
                        </Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Icon name="event" size={24} color={theme.colors.primary} />
                        <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
                            Event reminders
                        </Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Icon name="people" size={24} color={theme.colors.primary} />
                        <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
                            New family member alerts
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity
                    style={[styles.enableButton, { backgroundColor: theme.colors.primary }]}
                    onPress={requestNotificationPermission}
                    disabled={loading}
                >
                    <Text style={styles.enableButtonText}>
                        {loading ? 'Enabling...' : 'Enable Notifications'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={skipNotifications}
                    disabled={loading}
                >
                    <Text style={[styles.skipButtonText, { color: theme.colors.onSurfaceVariant }]}>
                        Maybe Later
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    features: {
        width: '100%',
        marginBottom: 30,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    featureText: {
        fontSize: 14,
        marginLeft: 10,
    },
    enableButton: {
        width: '100%',
        paddingVertical: 15,
        borderRadius: 8,
        marginBottom: 15,
    },
    enableButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    skipButton: {
        paddingVertical: 10,
    },
    skipButtonText: {
        fontSize: 14,
        textAlign: 'center',
    },
});

export default NotificationPrompt;