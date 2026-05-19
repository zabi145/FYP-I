import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AddGarden from '../Tasks/AddGarden';
import AdminHome from '../Tasks/AdminHome'
import AddGardener from '../Tasks/AddGardener'
import AddFlower from '../Tasks/AddFlower'


const Navigation= ()=>{
    const stack=createNativeStackNavigator()

    return(
        <NavigationContainer>
            <stack.Navigator screenOptions={{headerShown : false}} >

                <stack.Screen name="AdminHome" component={AdminHome}></stack.Screen>
                <stack.Screen name="AddGarden" component={AddGarden}></stack.Screen>
                <stack.Screen name="AddGardener" component={AddGardener}></stack.Screen>
                <stack.Screen name="AddFlower" component={AddFlower}></stack.Screen>
            </stack.Navigator>
        </NavigationContainer>

    )

}

export default Navigation