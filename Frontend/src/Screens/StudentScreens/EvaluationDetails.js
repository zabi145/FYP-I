import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import { BASE_URL } from '../../config';

export default function EvaluationDetails({ navigation, route }) {

    const { reg_no, course_no, assignment_id,semester_no,section,discipline,current_sem } = route.params;

    const [videoPath, setVideoPath] = useState(null);
    const [neck, setNeck] = useState(0);
    const [eyes, setEyes] = useState(0);
    const [relevance, setRelevance] = useState(0);
    const [confidence, setConfidence] = useState(0);
    const [faceVerified, setFaceVerified] = useState("No");

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        try {
            const response = await fetch(
                `${BASE_URL}/assignment/get-student-side-videos`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assignment_id: assignment_id, 
                        reg_no: reg_no,
                        course_no: course_no,
                        Semester_no: semester_no,   
                        section: section,
                        Discipline: discipline,
                        current_sem:current_sem
                    }),
                }
            );

            const data = await response.json();

            console.log("DETAIL API:", data);

            if (data.video_path) {

                const fullVideoUrl = `${BASE_URL}/videos/${data.video_path}`;

                setVideoPath(fullVideoUrl);
                setNeck(data.neck_movement);
                setEyes(data.eye_contact);
                setConfidence(data.confidence);
                setRelevance(data.topic_relevance || 0);
                setFaceVerified(data.face_verification);
            }

        } catch (error) {
            console.log(error);
        }
    };

    const evaluations = [
        { label: 'Communication', score: confidence },
        { label: 'Eye Contact', score: eyes },
        { label: 'Neck Stability', score: neck },
        { label: 'Topic Relevance', score: relevance },
    ];

    return (
        <SafeAreaView style={styles.container}>

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back-ios" size={20} />
                </TouchableOpacity>

                <Text style={styles.headerID}>{reg_no}</Text>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* VIDEO */}
                <View style={styles.videoCard}>
                    {videoPath ? (
                        <Video
                            source={{ uri: videoPath }}
                            style={styles.videoPlayer}
                            controls
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={{ color: "#fff", textAlign: "center" }}>No Video</Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>Evaluation</Text>

                {/* SCORES */}
                {evaluations.map((item, index) => (
                    <View key={index} style={styles.scoreCard}>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreLabel}>{item.label}</Text>
                            <Text style={styles.scoreValue}>{item.score}%</Text>
                        </View>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${item.score}%` }]} />
                        </View>
                    </View>
                ))}

                {/* FACE VERIFIED */}
                <View style={styles.scoreCard}>
                    <View style={styles.scoreRow}>
                        <Text style={styles.scoreLabel}>Face Verified</Text>
                        <Text style={styles.scoreValue}>{faceVerified}</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        marginTop: 10 
    },
    backBtn: { 
        backgroundColor: '#F9FAFB', 
        width: 40, 
        height: 40, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    headerID: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    
    scrollContent: { padding: 20 },
    
    // Video Styling
    videoCard: {
        width: '100%',
        height: 200,
        backgroundColor: '#1F2937',
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        marginBottom: 30,
    },
    videoPlayer: { width: '100%', height: '100%' },

    sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 20 },

    // Score Card Styling
    scoreCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    scoreLabel: { fontSize: 14, fontWeight: 'bold', color: '#000' },
    scoreValue: { fontSize: 20, fontWeight: 'bold', color: '#000' },
    subText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    
    // Progress Bar Styling
    progressContainer: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        marginTop: 15,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#A855F7', // Purple Color from screenshot
        borderRadius: 4,
    },

    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusText: { fontSize: 16, fontWeight: 'bold', marginRight: 8, color: '#000' },
});