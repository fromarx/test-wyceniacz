import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Alert, Platform, KeyboardAvoidingView
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import {
  Plus, Search, ChevronRight, X, Ruler, Package, Check,
  ChevronLeft, Trash2, Box, UserPlus, Briefcase, FileText, Settings2
} from 'lucide-react-native';
import {
  Quote, QuoteItem, QuoteStatus, Service, UnitOfMeasure,
  MaterialMode, Client, MaterialItem
} from '../types';
import { PdfGenerator } from '../utils/PdfGenerator'; // Upewnij się, że ścieżka jest poprawna

type RootStackParamList = {
  NewQuote: { id?: string };
  QuoteDetails: { id: string };
};

const NewQuote: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NewQuote'>>();
  const id = route.params?.id;

  const { state, addQuote, updateQuote, addClient, setActiveScreen } = useAppContext();
  const { darkMode, clients, services, user } = state;

  const isEditMode = !!id;
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);

  // --- STANY FORMULARZA ---
  const [clientInfo, setClientInfo] = useState({
    clientId: '', firstName: '', lastName: '', phone: '', email: '',
    clientCompany: '', clientNip: '', serviceStreet: '', serviceHouseNo: '',
    serviceApartmentNo: '', servicePostalCode: '', serviceCity: '',
  });

  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);

  // Stan dla nowej usługi "z ręki"
  const [customService, setCustomService] = useState<Partial<QuoteItem>>({
    name: '', netPrice: 0, quantity: 1, unit: 'm2', vatRate: 8,
    materialMode: 'estimated', estimatedMaterialPrice: 0, materials: []
  });

  // Stan dla pojedynczego materiału wewnątrz usługi
  const [tempMaterial, setTempMaterial] = useState<Partial<MaterialItem>>({
    name: '', price: 0, consumption: 1, unit: 'szt'
  });

  useEffect(() => { setActiveScreen('Nowa wycena'); }, []);

  // --- LOGIKA KLIENTA ---
  const handleSelectClient = (c: Client) => {
    setClientInfo({
      clientId: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone,
      email: c.email || '', clientCompany: c.companyName || '', clientNip: c.nip || '',
      serviceStreet: c.street, serviceHouseNo: c.houseNo, serviceApartmentNo: c.apartmentNo || '',
      servicePostalCode: c.postalCode, serviceCity: c.city
    });
    setShowClientPicker(false);
  };

  const saveClientToDb = async () => {
    if (!clientInfo.firstName || !clientInfo.phone) return Alert.alert("Błąd", "Imię i telefon są wymagane.");
    const newClient: Client = {
      id: `cli_${Date.now()}`, firstName: clientInfo.firstName, lastName: clientInfo.lastName,
      phone: clientInfo.phone, email: clientInfo.email, companyName: clientInfo.clientCompany,
      nip: clientInfo.clientNip, street: clientInfo.serviceStreet, houseNo: clientInfo.serviceHouseNo,
      city: clientInfo.serviceCity, postalCode: clientInfo.servicePostalCode, createdAt: new Date().toISOString()
    };
    await addClient(newClient);
    setClientInfo(prev => ({ ...prev, clientId: newClient.id }));
    Alert.alert("Sukces", "Klient zapisany w bazie.");
  };

  // --- LOGIKA USŁUG I MATERIAŁÓW ---
  const addMaterialToCustom = () => {
    if (!tempMaterial.name || !tempMaterial.price) return;
    const newItem: MaterialItem = {
      id: `mat_${Date.now()}`, name: tempMaterial.name, price: Number(tempMaterial.price),
      unit: tempMaterial.unit as UnitOfMeasure, quantity: 0, consumption: Number(tempMaterial.consumption) || 1
    };
    setCustomService(prev => ({ ...prev, materials: [...(prev.materials || []), newItem] }));
    setTempMaterial({ name: '', price: 0, consumption: 1, unit: 'szt' });
  };

  const addServiceToQuote = (s?: Service) => {
    const newItem: QuoteItem = s ? {
      id: `item_${Date.now()}`, serviceId: s.id, name: s.name, quantity: 1,
      netPrice: s.netPrice, vatRate: s.vatRate, unit: s.unit,
      materialMode: s.materialMode, estimatedMaterialPrice: s.estimatedMaterialPrice,
      materials: s.defaultMaterials || []
    } : {
      ...(customService as QuoteItem),
      id: `item_${Date.now()}`, serviceId: 'custom'
    };

    setSelectedItems([...selectedItems, newItem]);
    if (!s) setCustomService({ name: '', netPrice: 0, quantity: 1, unit: 'm2', vatRate: 8, materialMode: 'estimated', estimatedMaterialPrice: 0, materials: [] });
  };

  // --- OBLICZENIA ---
  const calculateItemTotal = (item: QuoteItem) => {
    const labor = item.netPrice * item.quantity;
    let materials = 0;
    if (item.materialMode === 'estimated') {
      materials = (item.estimatedMaterialPrice || 0) * item.quantity;
    } else {
      materials = item.materials.reduce((sum, m) => sum + (m.price * (m.consumption || 1) * item.quantity), 0);
    }
    const net = labor + materials;
    return { net, vat: net * (item.vatRate / 100), gross: net * (1 + item.vatRate / 100) };
  };

  const getFinalTotals = () => {
    return selectedItems.reduce((acc, item) => {
      const res = calculateItemTotal(item);
      return { net: acc.net + res.net, vat: acc.vat + res.vat, gross: acc.gross + res.gross };
    }, { net: 0, vat: 0, gross: 0 });
  };

  const handleFinalSave = async () => {
    const totals = getFinalTotals();
    const quoteData: Quote = {
      id: isEditMode ? id! : `q_${Date.now()}`,
      number: `WYC/${new Date().getFullYear()}/${state.quotes.length + 1}`,
      date: new Date().toLocaleDateString('pl-PL'),
      status: QuoteStatus.DRAFT,
      ...clientInfo,
      clientFirstName: clientInfo.firstName, clientLastName: clientInfo.lastName,
      clientPhone: clientInfo.phone, clientEmail: clientInfo.email,
      clientCompany: clientInfo.clientCompany, serviceStreet: clientInfo.serviceStreet,
      serviceHouseNo: clientInfo.serviceHouseNo, serviceApartmentNo: clientInfo.serviceApartmentNo,
      servicePostalCode: clientInfo.servicePostalCode, serviceCity: clientInfo.serviceCity,
      items: selectedItems, totalNet: totals.net, totalVat: totals.vat, totalGross: totals.gross
    };

    if (isEditMode) updateQuote(quoteData);
    else addQuote(quoteData);

    await PdfGenerator.download(quoteData, user);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
            <ChevronLeft color={darkMode ? '#fff' : '#64748b'} size={28} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map(s => (
              <View key={s} style={[styles.stepDot, step >= s && styles.stepDotActive]} />
            ))}
          </View>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* KROK 1: KLIENT */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionTitle, { color: darkMode ? '#f1f5f9' : '#1e293b' }]}>Zleceniodawca</Text>
                <TouchableOpacity onPress={() => setShowClientPicker(true)} style={styles.linkBtn}>
                  <Search size={16} color="#2563eb" />
                  <Text style={styles.linkBtnText}>Baza klientów</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.card, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
                <CustomInput label="Imię*" value={clientInfo.firstName} onChangeText={(v:any) => setClientInfo({...clientInfo, firstName: v})} darkMode={darkMode} />
                <CustomInput label="Nazwisko*" value={clientInfo.lastName} onChangeText={(v:any) => setClientInfo({...clientInfo, lastName: v})} darkMode={darkMode} />
                <CustomInput label="Telefon*" value={clientInfo.phone} onChangeText={(v:any) => setClientInfo({...clientInfo, phone: v})} darkMode={darkMode} keyboardType="phone-pad" />
                <CustomInput label="Miejscowość" value={clientInfo.serviceCity} onChangeText={(v:any) => setClientInfo({...clientInfo, serviceCity: v})} darkMode={darkMode} />

                {!clientInfo.clientId && clientInfo.firstName && (
                  <TouchableOpacity style={styles.outlineAction} onPress={saveClientToDb}>
                    <UserPlus size={18} color="#2563eb" />
                    <Text style={styles.outlineActionText}>Zapisz w bazie na stałe</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* KROK 2: USŁUGI */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionTitle, { color: darkMode ? '#f1f5f9' : '#1e293b' }]}>Usługi i Materiały</Text>

              <View style={[styles.card, { backgroundColor: darkMode ? '#1e293b' : '#eff6ff', borderColor: '#3b82f6' }]}>
                <Text style={styles.cardLabel}>DODAJ USŁUGĘ "Z RĘKI"</Text>
                <TextInput placeholder="Nazwa usługi..." style={styles.simpleInput} value={customService.name} onChangeText={v => setCustomService({...customService, name: v})} />
                <View style={styles.row}>
                  <TextInput placeholder="Cena netto" style={[styles.simpleInput, { flex: 2, marginRight: 10 }]} keyboardType="numeric" onChangeText={v => setCustomService({...customService, netPrice: Number(v)})} />
                  <TextInput placeholder="jm" style={[styles.simpleInput, { flex: 1 }]} value={customService.unit} onChangeText={v => setCustomService({...customService, unit: v as any})} />
                </View>

                <View style={styles.modeToggle}>
                  <TouchableOpacity onPress={() => setCustomService({...customService, materialMode: 'estimated'})} style={[styles.modeBtn, customService.materialMode === 'estimated' && styles.modeBtnActive]}>
                    <Text style={styles.modeBtnText}>RYCZAŁT MAT.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCustomService({...customService, materialMode: 'detailed'})} style={[styles.modeBtn, customService.materialMode === 'detailed' && styles.modeBtnActive]}>
                    <Text style={styles.modeBtnText}>LISTA MAT.</Text>
                  </TouchableOpacity>
                </View>

                {customService.materialMode === 'estimated' ? (
                  <TextInput placeholder="Cena materiału na jm" style={styles.simpleInput} keyboardType="numeric" onChangeText={v => setCustomService({...customService, estimatedMaterialPrice: Number(v)})} />
                ) : (
                  <View style={styles.innerCard}>
                    <TextInput placeholder="Nazwa materiału" style={styles.simpleInput} value={tempMaterial.name} onChangeText={v => setTempMaterial({...tempMaterial, name: v})} />
                    <View style={styles.row}>
                      <TextInput placeholder="Cena" style={[styles.simpleInput, { flex: 1, marginRight: 5 }]} keyboardType="numeric" value={tempMaterial.price?.toString()} onChangeText={v => setTempMaterial({...tempMaterial, price: Number(v)})} />
                      <TextInput placeholder="Zużycie/jm" style={[styles.simpleInput, { flex: 1 }]} keyboardType="numeric" value={tempMaterial.consumption?.toString()} onChangeText={v => setTempMaterial({...tempMaterial, consumption: Number(v)})} />
                    </View>
                    <TouchableOpacity style={styles.addMatBtn} onPress={addMaterialToCustom}>
                      <Plus size={14} color="#fff" />
                      <Text style={styles.addMatBtnText}>DODAJ MATERIAŁ</Text>
                    </TouchableOpacity>
                    {customService.materials?.map(m => <Text key={m.id} style={styles.matListText}>• {m.name} ({m.price}zł x {m.consumption})</Text>)}
                  </View>
                )}

                <TouchableOpacity style={styles.addServiceBtn} onPress={() => addServiceToQuote()}>
                  <Text style={styles.addServiceBtnText}>DODAJ DO WYCENY</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardLabel}>LUB WYBIERZ Z KATALOGU</Text>
              {services.map(s => (
                <TouchableOpacity key={s.id} onPress={() => addServiceToQuote(s)} style={[styles.serviceItem, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
                  <Text style={{ color: darkMode ? '#cbd5e1' : '#334155', flex: 1, fontWeight: 'bold' }}>{s.name}</Text>
                  <Plus size={20} color="#2563eb" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* KROK 3: PODSUMOWANIE */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionTitle, { color: darkMode ? '#f1f5f9' : '#1e293b' }]}>Podsumowanie</Text>

              {selectedItems.map((item, idx) => {
                const res = calculateItemTotal(item);
                return (
                  <View key={item.id} style={[styles.summaryItem, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.sumName}>{idx+1}. {item.name}</Text>
                      <TouchableOpacity onPress={() => setSelectedItems(selectedItems.filter(i => i.id !== item.id))}>
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.sumDetailRow}>
                      <Text style={styles.sumLabel}>Ilość (metraż):</Text>
                      <TextInput
                        style={styles.sumInput}
                        keyboardType="numeric"
                        value={item.quantity.toString()}
                        onChangeText={v => {
                          const newItems = [...selectedItems];
                          newItems[idx].quantity = Number(v);
                          setSelectedItems(newItems);
                        }}
                      />
                      <Text style={styles.sumLabel}>{item.unit}</Text>
                    </View>

                    <View style={styles.sumInfoRow}>
                      <Text style={styles.sumSubLabel}>Robocizna: {item.netPrice * item.quantity} zł</Text>
                      <Text style={styles.sumSubLabel}>Materiał: {res.net - (item.netPrice * item.quantity)} zł</Text>
                    </View>
                    <Text style={styles.sumTotal}>Suma pozycji: {res.gross.toFixed(2)} zł</Text>
                  </View>
                );
              })}

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>ŁĄCZNIE DO ZAPŁATY (BRUTTO)</Text>
                <Text style={styles.totalValue}>{getFinalTotals().gross.toLocaleString()} zł</Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* STOPKA NAWIGACJI */}
        <View style={styles.footer}>
          {step > 1 && (
             <TouchableOpacity style={[styles.navBtn, styles.navBtnBack]} onPress={() => setStep(step - 1)}>
              <ChevronLeft color="#64748b" />
              <Text style={styles.navBtnBackText}>WSTECZ</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnNext, step === 3 && { backgroundColor: '#10b981' }]}
            onPress={() => step < 3 ? setStep(step + 1) : handleFinalSave()}
          >
            <Text style={styles.navBtnNextText}>{step === 3 ? 'ZAPISZ I GENERUJ PDF' : 'DALEJ'}</Text>
            {step < 3 && <ChevronRight color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* MODAL KLIENTA */}
        <Modal visible={showClientPicker} animationType="slide">
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#020617' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#000' }]}>Wybierz klienta</Text>
              <TouchableOpacity onPress={() => setShowClientPicker(false)}><X size={24} color={darkMode ? '#fff' : '#000'} /></TouchableOpacity>
            </View>
            <ScrollView>
              {clients.map(c => (
                <TouchableOpacity key={c.id} style={styles.clientPickerItem} onPress={() => handleSelectClient(c)}>
                  <Briefcase size={20} color="#64748b" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontWeight: 'bold', color: darkMode ? '#fff' : '#000' }}>{c.firstName} {c.lastName}</Text>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>{c.city}, {c.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const CustomInput = ({ label, darkMode, ...props }: any) => (
  <View style={styles.inputWrapper}>
    <Text style={[styles.label, { color: darkMode ? '#64748b' : '#94a3b8' }]}>{label}</Text>
    <TextInput style={[styles.input, { color: darkMode ? '#fff' : '#000', borderBottomColor: darkMode ? '#1e293b' : '#e2e8f0' }]} {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 40 : 16 },
  stepIndicator: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: '#2563eb', width: 20 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  stepContainer: { gap: 20 },
  sectionTitle: { fontSize: 26, fontWeight: '900' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  cardLabel: { fontSize: 10, fontWeight: '900', color: '#3b82f6', marginBottom: 10, letterSpacing: 1 },
  inputWrapper: { marginBottom: 15 },
  label: { fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  input: { height: 45, borderBottomWidth: 1, fontSize: 16 },
  simpleInput: { height: 48, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, marginBottom: 12, borderWidth: 1, borderColor: '#d1d5db', fontSize: 14 },
  modeToggle: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  modeBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#cbd5e1', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#2563eb' },
  modeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  innerCard: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 16, marginBottom: 10 },
  addMatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#64748b', padding: 10, borderRadius: 10, alignSelf: 'flex-start' },
  addMatBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  matListText: { fontSize: 11, color: '#475569', marginTop: 5, fontStyle: 'italic' },
  addServiceBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  addServiceBtnText: { color: '#fff', fontWeight: 'bold' },
  serviceItem: { flexDirection: 'row', padding: 18, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryItem: { padding: 20, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sumName: { fontSize: 16, fontWeight: 'bold' },
  sumDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 },
  sumInput: { width: 60, height: 40, borderBottomWidth: 2, borderBottomColor: '#2563eb', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  sumLabel: { color: '#64748b', fontWeight: 'bold' },
  sumInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  sumSubLabel: { fontSize: 11, color: '#94a3b8' },
  sumTotal: { fontSize: 16, fontWeight: '900', color: '#2563eb', marginTop: 10, textAlign: 'right' },
  totalBox: { padding: 30, backgroundColor: '#1e293b', borderRadius: 28, alignItems: 'center', marginVertical: 20 },
  totalLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  totalValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(255,255,255,0.9)', flexDirection: 'row', gap: 10 },
  navBtn: { flex: 2, height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  navBtnBack: { flex: 1, backgroundColor: '#f1f5f9' },
  navBtnNext: { backgroundColor: '#2563eb' },
  navBtnBackText: { color: '#64748b', fontWeight: 'bold' },
  navBtnNextText: { color: '#fff', fontWeight: '900' },
  modalContent: { flex: 1, padding: 20, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  clientPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkBtnText: { color: '#2563eb', fontWeight: 'bold', fontSize: 12 },
  outlineAction: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2563eb', borderStyle: 'dashed' },
  outlineActionText: { color: '#2563eb', fontWeight: 'bold', fontSize: 12 }
});

export default NewQuote;