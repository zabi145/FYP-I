import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; 
import { pick, types } from '@react-native-documents/picker'; 
import { BASE_URL } from '../../config';

export default function VideoUploadScreen({ navigation, route }) {

    const {
        assignment_id,
        topic,
        topic_description,
        deadline_date,
        deadline_time,
        reg_no,
        course_no,
        section,
        semester_no,
        discipline
    } = route.params;

    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploaded, setUploaded] = useState(false); 

    // ✅ PICK VIDEO
    const pickVideo = async () => {
        try {
            const [result] = await pick({
                type: [types.video],
            });

            if (result) {
                setVideo(result);
                Alert.alert('Success', `Video Selected: ${result.name}`);
            }
        } catch (err) {
            console.log(err);
        }
    };

    // ✅ UPLOAD API
    const handleEvaluation = async () => {

        if (!video) {
            Alert.alert("Missing Video", "Please upload a video first");
            return;
        }

        setLoading(true);

        try {
            const formData = new FormData();

            formData.append("reg_no", reg_no);
            formData.append("section", section);
            formData.append("semester_no", semester_no);
            formData.append("course_no", course_no);
            formData.append("discipline", discipline);
            formData.append("assignment_id", assignment_id);

            formData.append("video", {
                uri: video.uri,
                type: video.type || "video/mp4",
                name: video.name || "video.mp4"
            });

            const response = await fetch(
                `${BASE_URL}/student/upload-video`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            console.log("UPLOAD RESPONSE:", data);

            if (data.message) {
                setUploaded(true); // 🔥 disable button
                Alert.alert("Video uploaded & sent for evaluation");
            } else {
                Alert.alert("Error", data.error || "Upload failed");
            }

        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back-ios" size={22} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={styles.label}>TOPIC NAME</Text>
                <Text style={styles.title}>{topic}</Text>

                <Text style={styles.label}>TOPIC DESCRIPTION</Text>
                <View style={styles.descriptionBox}>
                    <Text>{topic_description}</Text>
                </View>

                <Text style={styles.label}>DEADLINE</Text>
                <View style={styles.deadlineBox}>
                    <Text>{deadline_date} • {deadline_time}</Text>
                </View>

                <Text style={styles.label}>YOUR SUBMISSION</Text>

                <TouchableOpacity style={styles.uploadBox} onPress={pickVideo}>
                    <Text style={styles.uploadTitle}>
                        {video ? "Video Selected" : "Upload Video"}
                    </Text>
                    <Text>{video ? video.name : "MP4 or MOV"}</Text>
                </TouchableOpacity>

                {/*  BUTTON */}
                <TouchableOpacity
                    style={[
                        styles.evaluationBtn,
                        (uploaded || !video) && styles.disabledBtn
                    ]}
                    disabled={uploaded || !video || loading}
                    onPress={handleEvaluation}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.evaluationBtnText}>
                            {uploaded ? "Uploaded" : "Send For Evaluation"}
                        </Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    content: { paddingHorizontal: 25, paddingBottom: 40 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#000', letterSpacing: 1.2, marginTop: 25, marginBottom: 8 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 5 },
    descriptionBox: { backgroundColor: '#F3F7F9', padding: 20, borderRadius: 20 },
    descriptionText: { fontSize: 15, lineHeight: 22, color: '#1F2937' },
    deadlineBox: { 
        backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6',
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 
    },
    deadlineDate: { fontSize: 16, fontWeight: 'bold', color: '#000' },
    lateWarning: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', marginTop: 4 },
    uploadBox: { 
        borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 25, 
        height: 200, justifyContent: 'center', alignItems: 'center', marginTop: 10, backgroundColor: '#FBFAFF' 
    },
    uploadTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    uploadSub: { fontSize: 12, color: '#9CA3AF', marginTop: 5 },
    submitBtn: { backgroundColor: '#A855F7', paddingVertical: 15, borderRadius: 15, marginTop: 30, alignItems: 'center' },
    submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    
    evaluationBtn: {
    backgroundColor: '#A855F7',
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 40,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
},

disabledBtn: {
    backgroundColor: '#D1D5DB',
    elevation: 0,
    shadowOpacity: 0,
},

evaluationBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
},
});