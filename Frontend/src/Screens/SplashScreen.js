import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  StatusBar
} from "react-native";

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* <StatusBar barStyle="light-content" /> */}

      <ImageBackground
        source={require("../Images/SplashScreen.jpeg")} // replace with your background image path
        style={styles.background}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { paddingTop: 300 }]}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.bar}></View>
            <View style={styles.bar}></View>
            <View style={styles.bar}></View>
          </View>

          {/* Title */}
          <Text style={styles.title}>BIIT Flip Videos Evaluator</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Video-based assessment for the{"\n"}modern classroom.
          </Text>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Sign In Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Login')}
            style={styles.button} // directly apply background color here
          >
            <Text style={styles.buttonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1
  },

  background: {
    flex: 1,
    justifyContent: "center"
  },

  overlay: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 140,
    paddingBottom: 50,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)"
  },

  logoContainer: {
    flexDirection: "row",
    marginBottom: 20
  },

  bar: {
    width: 6,
    height: 28,
    backgroundColor: "#a855f7",
    marginHorizontal: 3,
    borderRadius: 4
  },

  title: {
    fontSize: 32,
    color: "white",
    fontWeight: "700",
    marginBottom: 10,
    textAlign:'center'
  },

  subtitle: {
    color: "#E0E0E0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  },

  button: {
    width: 260,
    height: 55,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    backgroundColor: "#a855f7" // solid color instead of gradient
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  },

  footer: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#CCCCCC"
  }

});