import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

export default function App() {
  const [screen, setScreen] = React.useState('login');

  if (screen === 'login') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Image source={require('./assets/icon.png')} style={{ width: 100, height: 100, marginBottom: 20 }} />
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#00217D', marginBottom: 5 }}>PYEBWA Token</Text>
          <Text style={{ fontSize: 16, color: '#666' }}>Preserve Heritage • Plant Trees</Text>
        </View>
        <TouchableOpacity 
          style={{ backgroundColor: '#00217D', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 10 }}
          onPress={() => setScreen('home')}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Demo Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#00217D', padding: 20, paddingTop: 50 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>PYEBWA Token</Text>
        <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>🌳 Tree Planter Dashboard</Text>
      </View>
      
      <View style={{ flex: 1, padding: 20 }}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: '#666', marginBottom: 10 }}>Your Earnings</Text>
          <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#4CAF50' }}>1,000 PYEBWA</Text>
          <Text style={{ fontSize: 16, color: '#999', marginTop: 5 }}>≈ $0.10 USD</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
          <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>50</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>Trees Planted</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#00217D' }}>200</Text>
            <Text style={{ fontSize: 14, color: '#666', marginTop: 5 }}>Pending</Text>
          </View>
        </View>

        <TouchableOpacity style={{ backgroundColor: '#00217D', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>📸 Submit New Planting</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ backgroundColor: '#D41125', padding: 15, borderRadius: 10, alignItems: 'center' }}
          onPress={() => setScreen('login')}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}