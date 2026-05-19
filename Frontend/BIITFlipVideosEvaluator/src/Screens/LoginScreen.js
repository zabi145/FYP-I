import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../config'

export default function LoginScreen({ navigation }) {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {

    if (email === '' || password === '') {
        Alert.alert("Error", "Please enter email and password");
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        Alert.alert("Invalid Email", "Please enter correct email format");
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

const data = await response.json();

if (data.message === "Login Successful") {

    if (data.User.role === "teacher") {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Teacherdashboard',
                       params : {userId: data.User.Id}
             }]
        });
    } else {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Studentdashboard',
                       params : {userId: data.User.Id}
             }]
        });
    }

} else {
    Alert.alert("Login Failed", data.message);
}

    } catch (error) {
        console.log(error); 
        Alert.alert("Error", "Server not reachable");
    }
};

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                {/* <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="chevron-back" size={28} color="black" />
                </TouchableOpacity> */}

                <Text style={styles.headerTitle}>Log In</Text>

                <View style={{ width: 28 }} />
            </View>

            {/* Form */}
            <View style={styles.form}>

                <Text style={styles.label}>Email Address</Text>

                <TextInput
                    style={styles.input}
                    placeholder="name@email.com"
                    value={email}
                    onChangeText={setEmail}
                    //keyboardType="email-address"
                />

                <Text style={styles.label}>Password</Text>

                <View style={styles.passwordContainer}>

                    <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter password"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Icon
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color="gray"
                        />
                    </TouchableOpacity>

                </View>

                {/* Login Button */}

                <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={handleLogin}
                >
                    <Text style={styles.loginBtnText}>Login</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 25
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },

    form: {
        marginTop: 60
    },

    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20
    },

    input: {
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        padding: 15,
        marginTop: 8
    },

    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginTop: 8
    },

    passwordInput: {
        flex: 1,
        paddingVertical: 15
    },

    loginBtn: {
        backgroundColor: '#a855f7',
        paddingVertical: 15,
        borderRadius: 12,
        marginTop: 40
    },

    loginBtnText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold'
    }
});


