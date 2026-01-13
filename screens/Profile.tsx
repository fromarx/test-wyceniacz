import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Image, 
  Alert, 
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppContext } from '../store/AppContext';
import { 
  User as UserIcon, Building2, MapPin, Mail,
  ChevronLeft, CheckCircle2, Edit3, X, Zap, Trash2, 
  Upload, Database, Palette
} from 'lucide-react-native';
import { User, SubscriptionStatus } from '../types';
import { useToast } from '../components/Toast';
import { getThemeColors, getShadows } from '../utils/theme';

interface ProfileProps {
  forced?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ forced = false }) => {
  const { state, updateUser, setActiveScreen, exportAllData } = useAppContext();
  const { user, darkMode, subscriptionStatus } = state;
  const colors = getThemeColors(darkMode);
  const shadows = getShadows(darkMode);
  const { showToast } = useToast();
  const navigation = useNavigation();

  const [isEditing, setIsEditing] = useState(forced);
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState<User>(user || {
    id: '1', email: '', firstName: '', lastName: '', companyName: '', nip: '', phone: '', address: '', city: '', postalCode: '', pdfThemeColor: '#2563eb'
  });

  useEffect(() => {
    if (user) setFormData(user);
  }, [user]);

  const pdfThemes = [
    { color: '#2563eb', name: 'Executive Blue' },
    { color: '#0f172a', name: 'Midnight Navy' },
    { color: '#059669', name: 'Emerald Success' },
  ];

  const handleSave = () => {
    const requiredFields: (keyof User)[] = ['firstName', 'lastName', 'companyName', 'address', 'city', 'postalCode'];
    const missing = requiredFields.filter(f => !formData[f]);
    
    if (missing.length > 0) {
      showToast("Uzupełnij wymagane pola (Imię, Nazwisko, Firma, Adres)", "error");
      return;
    }
    
    updateUser(formData);
    setIsEditing(false);
    
    if (forced) {
       // @ts-ignore
      navigation.replace('MainTabs'); 
    } else {
      showToast("Profil zaktualizowany", "success");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const fileName = `Wyceniarz_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
      showToast("Eksport zakończony", "success");
    } catch (err) {
      console.log(err);
      showToast("Błąd eksportu danych", "error");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    setActiveScreen('Profil');
  }, []);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData(prev => ({ ...prev, logo: base64Image }));
      showToast("Logo wgrane", "success");
    }
  };

  const removeLogo = () => {
    Alert.alert("Usuń logo", "Czy na pewno chcesz usunąć logo firmowe?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => {
          setFormData(prev => ({ ...prev, logo: '' }));
          showToast("Logo usunięte", "info");
      }}
    ]);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {!forced && (
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={[styles.backIconBox, { backgroundColor: colors.surface }]}>
            <ChevronLeft size={24} color={colors.text} />
          </View>
          <Text style={[styles.backText, { color: colors.text }]}>Wróć</Text>
        </TouchableOpacity>
      )}

      {/* Profil Header */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.md }]}>
        <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
          <Zap size={12} color={colors.accent} fill={colors.accent} />
          <Text style={[styles.badgeText, { color: colors.accent }]}>
            {subscriptionStatus === SubscriptionStatus.ACTIVE ? 'PREMIUM' : 'STANDARD'}
          </Text>
        </View>
        
        <View style={[styles.logoCircle, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {formData.logo ? (
            <Image source={{ uri: formData.logo }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <Text style={[styles.logoPlaceholder, { color: colors.accent }]}>{formData.companyName?.[0] || 'Q'}</Text>
          )}
        </View>
        
        <Text style={[styles.userName, { color: colors.text }]}>{formData.firstName} {formData.lastName}</Text>
        <Text style={[styles.userCompany, { color: colors.textSecondary }]}>{formData.companyName || 'Nowa Firma'}</Text>
      </View>

      <View style={styles.formSection}>
        {/* Sekcja: Dane */}
        <SectionTitle icon={<UserIcon size={18} color={colors.accent} />} title="Dane Właściciela" colors={colors} />
        <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <InputField label="Imię" value={formData.firstName} onChangeText={(v: string) => setFormData({...formData, firstName: v})} editable={isEditing} colors={colors} />
            <InputField label="Nazwisko" value={formData.lastName} onChangeText={(v: string) => setFormData({...formData, lastName: v})} editable={isEditing} colors={colors} />
          </View>
          <InputField label="E-mail" value={formData.email} onChangeText={(v: string) => setFormData({...formData, email: v})} editable={isEditing} colors={colors} icon={<Mail size={16} color={colors.textMuted} />} />
        </View>

        {/* Sekcja: Logo i Firma */}
        <SectionTitle icon={<Building2 size={18} color={colors.accent} />} title="Firma i Logo" colors={colors} />
        <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.logoPicker, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.logoPreviewBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {formData.logo ? (
                <Image source={{ uri: formData.logo }} style={styles.logoImageSmall} />
              ) : (
                <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 20 }}>Q</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              {isEditing ? (
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.uploadBtn, { borderColor: colors.accent }]} onPress={pickLogo}>
                    <Upload size={14} color={colors.accent} />
                    <Text style={[styles.uploadBtnText, { color: colors.accent }]}>WGRAJ</Text>
                  </TouchableOpacity>
                  {formData.logo && (
                    <TouchableOpacity style={styles.deleteLogoBtn} onPress={removeLogo}>
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={[styles.logoInfo, { color: colors.textMuted }]}>Logo pojawi się na PDF.</Text>
              )}
            </View>
          </View>
          
          <InputField label="Nazwa firmy" value={formData.companyName} onChangeText={(v: string) => setFormData({...formData, companyName: v})} editable={isEditing} colors={colors} />
          <InputField label="Ulica" value={formData.address} onChangeText={(v: string) => setFormData({...formData, address: v})} editable={isEditing} colors={colors} />
          <View style={styles.row}>
            <InputField label="Kod" value={formData.postalCode} onChangeText={(v: string) => setFormData({...formData, postalCode: v})} editable={isEditing} colors={colors} />
            <InputField label="Miejscowość" value={formData.city} onChangeText={(v: string) => setFormData({...formData, city: v})} editable={isEditing} colors={colors} />
          </View>
        </View>

        {/* Motyw PDF */}
        <SectionTitle icon={<Palette size={18} color={colors.accent} />} title="Wygląd PDF" colors={colors} />
        <View style={[styles.inputGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            {pdfThemes.map(theme => (
              <TouchableOpacity 
                key={theme.color}
                disabled={!isEditing}
                onPress={() => setFormData({...formData, pdfThemeColor: theme.color})}
                style={[
                  styles.themeBtn, 
                  { backgroundColor: theme.color, borderColor: formData.pdfThemeColor === theme.color ? colors.accent : 'transparent' }
                ]}
              />
            ))}
          </View>
        </View>

        {/* Eksport Danych */}
        <SectionTitle icon={<Database size={18} color={colors.accent} />} title="Baza danych" colors={colors} />
        <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.surfaceSubtle }]} onPress={handleExport}>
          {isExporting ? <ActivityIndicator size="small" color={colors.accent} /> : <Database size={20} color={colors.accent} />}
          <Text style={[styles.exportBtnText, { color: colors.text }]}>EKSPORTUJ KOPIĘ (JSON)</Text>
        </TouchableOpacity>

        {/* Przyciski Akcji */}
        <View style={styles.actions}>
          {isEditing ? (
            <View style={styles.row}>
              {!forced && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle }]} onPress={() => { setIsEditing(false); setFormData(user!); }}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.accent }]} onPress={handleSave}>
                <CheckCircle2 size={20} color="#fff" />
                <Text style={styles.saveBtnText}>ZAPISZ</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.editBtnFull, { borderColor: colors.border }]} onPress={() => setIsEditing(true)}>
              <Edit3 size={20} color={colors.text} />
              <Text style={[styles.editBtnText, { color: colors.text }]}>EDYTUJ PROFIL</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

// --- Komponenty pomocnicze ---

const SectionTitle = ({ icon, title, colors }: any) => (
  <View style={styles.sectionHeader}>
    {icon}
    <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{title}</Text>
  </View>
);

const InputField = ({ label, value, onChangeText, editable, icon, colors }: any) => (
  <View style={styles.inputField}>
    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{label}</Text>
    <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {icon && <View style={styles.inputIcon}>{icon}</View>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        style={[styles.input, { color: colors.text, opacity: editable ? 1 : 0.6 }]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
  },
  backIconBox: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  backText: {
    fontWeight: '700',
    fontSize: 16,
  },
  profileCard: { margin: 16, padding: 24, borderRadius: 32, borderWidth: 1, alignItems: 'center' },
  badge: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '900', marginLeft: 4 },
  logoCircle: { width: 100, height: 100, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { fontSize: 32, fontWeight: '900' },
  userName: { fontSize: 22, fontWeight: '900' },
  userCompany: { fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  formSection: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 24, paddingLeft: 4 },
  sectionHeaderText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  inputGroup: { borderRadius: 24, padding: 20, borderWidth: 1, gap: 16 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  inputField: { flex: 1, gap: 6 },
  inputLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', paddingLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  logoPicker: { padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoPreviewBox: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImageSmall: { width: '100%', height: '100%' },
  logoInfo: { fontSize: 12, fontStyle: 'italic' },
  uploadBtn: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtnText: { fontSize: 11, fontWeight: '900' },
  deleteLogoBtn: { padding: 10 },
  themeBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, gap: 12, marginTop: 12 },
  exportBtnText: { fontSize: 12, fontWeight: '800' },
  actions: { marginTop: 32 },
  actionBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 2 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  editBtnFull: { width: '100%', borderWidth: 2 },
  editBtnText: { fontWeight: '900', fontSize: 14 }
});

export default Profile;
