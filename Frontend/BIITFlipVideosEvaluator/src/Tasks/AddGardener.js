// import React from 'react';
// import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
// import { BASE_URL } from '../config';

// const AddGardener = ({ navigation }) => {
//   return (
//     <View style={styles.container}>
//       {/* Header (Agar stack navigation use kar rahe hain to ye auto bhi aa sakta hai) */}
//       <Text style={styles.header}>Add Gardener</Text>

//       {/* Gardener Name Field */}
//       <Text style={styles.label}>Gardener Name *</Text>
//       <TextInput 
//         style={styles.input} 
//         placeholder="Enter gardener name" 
//         placeholderTextColor="#999"
//       />

//       {/* Experience Field */}
//       <Text style={styles.label}>Experience (Years) *</Text>
//       <TextInput 
//         style={styles.input} 
//         placeholder="Enter experience in years" 
//         placeholderTextColor="#999"
//         keyboardType="numeric" 
//       />

//       {/* Garden Selection (Dropdown Placeholder) */}
//       <Text style={styles.label}>Garden *</Text>
//       <TextInput 
//         style={styles.input} 
//         placeholder="Enter Gardener" 
//         placeholderTextColor="#999"
//       />

//       {/* Save Button */}
//       <TouchableOpacity 
//         style={styles.button}
//         onPress={() => alert('Gardener Saved!')}
//       >
//         <Text style={styles.buttonText}>Save Gardener</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1, 
//     padding: 20, 
//     backgroundColor: 'white', 
//     justifyContent: 'center' 
//   },
//   header: { 
//     fontSize: 20, 
//     fontWeight: 'bold', 
//     textAlign: 'center', 
//     marginBottom: 30 
//   },
//   label: { 
//     fontSize: 14,
//     fontWeight: 'bold', 
//     marginBottom: 8, 
//     marginTop: 20,
//     color: '#333'
//   },
//   input: { 
//     borderWidth: 1, 
//     borderColor: '#eee', 
//     padding: 15, 
//     borderRadius: 10, 
//     backgroundColor: '#fdfdfd',
//     fontSize: 16
//   },
//   dropdownContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#eee',
//     padding: 15,
//     borderRadius: 10,
//     backgroundColor: '#fdfdfd',
//   },
//   dropdownText: {
//     color: '#333',
//     fontSize: 16
//   },
//   dropdownArrow: {
//     fontSize: 14,
//     color: '#666'
//   },
//   button: { 
//     backgroundColor: '#5e43d3', 
//     paddingVertical: 15, 
//     borderRadius: 10, 
//     marginTop: 40, 
//     alignItems: 'center',
//     elevation: 2, // Android shadow
//     shadowColor: '#000', // iOS shadow
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   buttonText: { 
//     color: 'white', 
//     fontWeight: 'bold', 
//     fontSize: 16 
//   }
// });

// export default AddGardener;


import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BASE_URL } from '../config';

const AddGardener = ({ navigation }) => {
  const [id, setid] = useState('')
  const [name, setname] = useState('')
  const [experience, setexperience] = useState('')
  const [gardenId, setgardenId] = useState('')

  const SaveGardener = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/Flower/addGardener`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
         },
        body: JSON.stringify({
          GardenerId: parseInt(id),
          GardenerName: name,
          ExperienceYears: parseInt(experience),
          GardenId: parseInt(gardenId)
        })
      });

      const text = await response.text();
      if (response.ok) {
        Alert.alert("Success", "Gardener Added!");
      } else {
        Alert.alert("Error", text);
      }
    } catch (error) {
      Alert.alert("Error", "Server not reachable: " + error.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add Gardener</Text>

      <Text style={styles.label}>Gardener ID *</Text>
      <TextInput style={styles.input} placeholder="Enter gardener ID"
        keyboardType="numeric" onChangeText={setid} />

      <Text style={styles.label}>Gardener Name *</Text>
      <TextInput style={styles.input} placeholder="Enter gardener name"
        onChangeText={setname} />

      <Text style={styles.label}>Experience (Years) *</Text>
      <TextInput style={styles.input} placeholder="Enter experience"
        keyboardType="numeric" onChangeText={setexperience} />

      <Text style={styles.label}>Garden ID *</Text>
      <TextInput style={styles.input} placeholder="Enter garden ID"
        keyboardType="numeric" onChangeText={setgardenId} />

      <TouchableOpacity style={styles.button} onPress={SaveGardener}>
        <Text style={styles.buttonText}>Save Gardener</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: 'white', justifyContent: 'center' },
  header: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  label: { fontWeight: 'bold', marginBottom: 5, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: '#fafafa' },
  button: { backgroundColor: '#5e43d3', padding: 15, borderRadius: 8, marginTop: 40, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default AddGardener;