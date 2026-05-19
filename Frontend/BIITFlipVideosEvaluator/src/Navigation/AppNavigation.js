import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../Screens/SplashScreen';
import LoginScreen from '../Screens/LoginScreen';
import CreateAssignment from '../Screens/TeacherScreens/CreateAssignment';
import Teacherdashboard from '../Screens/TeacherScreens/Teacherdashboard';
import ShareAssignment from '../Screens/TeacherScreens/ShareAssignment'
import AssignmentReport from '../Screens/TeacherScreens/AssignmentReport'
import TeacherEvaluationScreen from '../Screens/TeacherScreens/TeacherEvaluationScreen';
import Studentdashboard from '../Screens/StudentScreens/Studentdashboard'
import AssignmentDetail from '../Screens/StudentScreens/AssignmentDetail'
import TaskScreen from '../Screens/StudentScreens/TaskScreen'
import ResultScreen from '../Screens/StudentScreens/ResultScreen'
import VideoUploadSceen from '../Screens/StudentScreens/VideoUploadScreen'
import EvaluationDetails from '../Screens/StudentScreens/EvaluationDetails'


const Stack = createNativeStackNavigator();

export default function AppNavigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Teacherdashboard" component={Teacherdashboard} />
        <Stack.Screen name="CreateAssignment" component={CreateAssignment} />
        <Stack.Screen name="ShareAssignment" component={ShareAssignment} />
        <Stack.Screen name="AssignmentReport" component={AssignmentReport} />
        <Stack.Screen name="TeacherEvaluationScreen" component={TeacherEvaluationScreen} />
        <Stack.Screen name="Studentdashboard" component={Studentdashboard} />
        <Stack.Screen name="AssignmentDetail" component={AssignmentDetail} />
        <Stack.Screen name="TaskScreen" component={TaskScreen} />
        <Stack.Screen name="ResultScreen" component={ResultScreen} />
        <Stack.Screen name="VideoUploadScreen" component={VideoUploadSceen} />
        <Stack.Screen name="EvaluationDetails" component={EvaluationDetails} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}