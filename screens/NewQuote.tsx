import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Alert, Platform, KeyboardAvoidingView, Animated
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import {
  Plus, Search, ChevronRight, X, Ruler, Package, Check,
  ChevronLeft, Trash2, Box, UserPlus, Briefcase, FileText, Settings2,
  Calendar
} from 'lucide-react-native';
import {
  Quote, QuoteItem, QuoteStatus, Service, UnitOfMeasure,
  MaterialMode, Client, MaterialItem
} from '../types';
import { PdfGenerator } from '../utils/PdfServiceMobile';
import { useToast } from '../components/Toast';
import { getThemeColors, getShadows } from '../utils/theme';

type RootStackParamList = {
  NewQuote: { id?: string };
  QuoteDetails: { id: string };
  MainTabs: { screen: string };
  Quotes: undefined;
};

const NewQuote: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NewQuote'>>();
  const id = route.params?.id;

  const { state, addQuote, updateQuote, addClient, setActiveScreen } = useAppContext();
  const { darkMode, clients, services, user } = state;
  const colors = getThemeColors(darkMode);
  const shadows = getShadows(darkMode);
  const { showToast } = useToast();
  const styles = getStyles(colors);

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
  const [estimatedDate, setEstimatedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [customService, setCustomService] = useState<Partial<QuoteItem>>({
    name: '', netPrice: 0, quantity: 1, unit: 'm2', vatRate: 8,
    materialMode: 'estimated', estimatedMaterialPrice: 0, materials: []
  });

  const [tempMaterial, setTempMaterial] = useState<Partial<MaterialItem>>({
    name: '', price: 0, consumption: 1, unit: 'szt'
  });

  useEffect(() => {
    setActiveScreen('Nowa wycena');
    if (isEditMode && id) {
      const q = state.quotes.find(x => x.id === id);
      if (q) {
        setClientInfo({
          clientId: q.clientId || '',
          firstName: q.clientFirstName,
          lastName: q.clientLastName,
          phone: q.clientPhone,
          email: q.clientEmail,
          clientCompany: q.clientCompany,
          clientNip: q.clientNip || '',
          serviceStreet: q.serviceStreet,
          serviceHouseNo: q.serviceHouseNo,
          serviceApartmentNo: q.serviceApartmentNo || '',
          servicePostalCode: q.servicePostalCode,
          serviceCity: q.serviceCity
        });
        setEstimatedDate(q.estimatedCompletionDate || '');
        setSelectedItems(q.items);
      }
    }
  }, [id, isEditMode, state.quotes]);

  // --- LOGIKA KLIENTA ---
  const handleSelectClient = (c: Client) => {
    setClientInfo({
      clientId: c.id, firstName: c.firstName, lastName: c.lastName, phone: c.phone,
      email: c.email || '', clientCompany: c.companyName || '', clientNip: c.nip || '',
      serviceStreet: c.street, serviceHouseNo: c.houseNo, serviceApartmentNo: c.apartmentNo || '',
      servicePostalCode: c.postalCode, serviceCity: c.city
    });
    setShowClientPicker(false);
    showToast('Dane klienta wczytane', 'info');
  };

  const saveClientToDb = async () => {
    if (!clientInfo.firstName || !clientInfo.phone) {
      showToast("Imię i telefon są wymagane", "error");
      return;
    }
    const newClient: Client = {
      id: `cli_${Date.now()}`, firstName: clientInfo.firstName, lastName: clientInfo.lastName,
      phone: clientInfo.phone, email: clientInfo.email, companyName: clientInfo.clientCompany,
      nip: clientInfo.clientNip, street: clientInfo.serviceStreet, houseNo: clientInfo.serviceHouseNo,
      city: clientInfo.serviceCity, postalCode: clientInfo.servicePostalCode, createdAt: new Date().toISOString()
    };
    await addClient(newClient);
    setClientInfo(prev => ({ ...prev, clientId: newClient.id }));
    showToast("Klient zapisany w bazie", "success");
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
    showToast('Dodano materiał', 'success', 1000);
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
    if (!s) {
      setCustomService({ name: '', netPrice: 0, quantity: 1, unit: 'm2', vatRate: 8, materialMode: 'estimated', estimatedMaterialPrice: 0, materials: [] });
      showToast("Usługa dodana do wyceny", "success");
    } else {
      showToast(`Dodano: ${s.name}`, "success");
    }
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

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // Na Androidzie zmiana daty od razu zamyka picker
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setEstimatedDate(selectedDate.toLocaleDateString('pl-PL'));
    }
  };

  const handleFinalSave = async () => {
    if (!clientInfo.firstName || !clientInfo.phone || !clientInfo.serviceCity) {
      Alert.alert('Błąd', 'Uzupełnij dane zleceniodawcy (imię, telefon, miejscowość).');
      setStep(1);
      return;
    }
    if (selectedItems.length === 0) {
      Alert.alert('Błąd', 'Dodaj przynajmniej jedną usługę do wyceny.');
      setStep(2);
      return;
    }

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
      estimatedCompletionDate: estimatedDate,
      items: selectedItems, totalNet: totals.net, totalVat: totals.vat, totalGross: totals.gross
    };

    try {
      if (isEditMode) {
        await updateQuote(quoteData);
      } else {
        await addQuote(quoteData);
      }

      Alert.alert(
        'Zapisano pomyślnie', 
        'Wycena została zapisana. Czy chcesz teraz wygenerować i wysłać PDF?',
        [
          { 
            text: 'Tylko zapisz', 
            onPress: () => navigation.navigate('MainTabs', { screen: 'Quotes' }) 
          },
          { 
            text: 'Zapisz i wyślij PDF', 
            onPress: async () => {
              await PdfGenerator.download(quoteData, user);
              navigation.navigate('MainTabs', { screen: 'Quotes' });
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Save quote error:', error);
      showToast('Błąd zapisu wyceny', 'error');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
            <ChevronLeft color={colors.textSecondary} size={28} />
          </TouchableOpacity>
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map(s => (
              <View 
                key={s} 
                style={[
                  styles.stepDot, 
                  { backgroundColor: step >= s ? colors.accent : colors.borderStrong },
                  step >= s && { width: 24 }
                ]} 
              />
            ))}
          </View>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* KROK 1: KLIENT */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.rowBetween}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Zleceniodawca</Text>
                <TouchableOpacity onPress={() => setShowClientPicker(true)} style={styles.linkBtn}>
                  <Search size={16} color={colors.accent} />
                  <Text style={[styles.linkBtnText, { color: colors.accent }]}>Baza klientów</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
                <CustomInput label="Imię*" value={clientInfo.firstName} onChangeText={(v:any) => setClientInfo({...clientInfo, firstName: v})} colors={colors} styles={styles} />
                <CustomInput label="Nazwisko*" value={clientInfo.lastName} onChangeText={(v:any) => setClientInfo({...clientInfo, lastName: v})} colors={colors} styles={styles} />
                <CustomInput label="Telefon*" value={clientInfo.phone} onChangeText={(v:any) => setClientInfo({...clientInfo, phone: v})} colors={colors} styles={styles} keyboardType="phone-pad" />
                <CustomInput label="Email (do wysyłki PDF)" value={clientInfo.email} onChangeText={(v:any) => setClientInfo({...clientInfo, email: v})} colors={colors} styles={styles} keyboardType="email-address" autoCapitalize="none" />
                <CustomInput label="Miejscowość*" value={clientInfo.serviceCity} onChangeText={(v:any) => setClientInfo({...clientInfo, serviceCity: v})} colors={colors} styles={styles} />

                <View style={styles.inputWrapper}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Szacowany termin realizacji</Text>
                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 }]}
                  >
                    <Calendar size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <Text style={{ color: estimatedDate ? colors.text : colors.textMuted, fontSize: 16 }}>
                      {estimatedDate || "Wybierz datę..."}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && Platform.OS === 'ios' && (
                    <Modal transparent animationType="fade" visible={showDatePicker}>
                      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                        <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20 }}>
                          <DateTimePicker
                            value={parseDate(estimatedDate)}
                            mode="date"
                            display="spinner"
                            onChange={onDateChange}
                            textColor={colors.text}
                          />
                          <TouchableOpacity 
                            onPress={() => setShowDatePicker(false)}
                            style={{ backgroundColor: colors.accent, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 }}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>ZATWIERDŹ</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Modal>
                  )}

                  {showDatePicker && Platform.OS === 'android' && (
                    <DateTimePicker
                      value={parseDate(estimatedDate)}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                    />
                  )}
                </View>

                {!clientInfo.clientId && clientInfo.firstName && (
                  <TouchableOpacity 
                    style={[styles.outlineAction, { borderColor: colors.accent }]} 
                    onPress={saveClientToDb}
                  >
                    <UserPlus size={18} color={colors.accent} />
                    <Text style={[styles.outlineActionText, { color: colors.accent }]}>Zapisz w bazie na stałe</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* KROK 2: USŁUGI */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Usługi i Materiały</Text>

              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
                <Text style={[styles.cardLabel, { color: colors.accent }]}>DODAJ USŁUGĘ "Z RĘKI"</Text>
                <TextInput 
                  placeholder="Nazwa usługi..." 
                  placeholderTextColor={colors.textMuted}
                  style={[styles.simpleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                  value={customService.name} 
                  onChangeText={v => setCustomService({...customService, name: v})} 
                />
                <View style={styles.row}>
                  <TextInput 
                    placeholder="Cena netto" 
                    placeholderTextColor={colors.textMuted}
                    style={[styles.simpleInput, { flex: 2, marginRight: 10, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                    keyboardType="numeric" 
                    onChangeText={v => setCustomService({...customService, netPrice: Number(v)})} 
                  />
                  <TextInput 
                    placeholder="jm" 
                    placeholderTextColor={colors.textMuted}
                    style={[styles.simpleInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                    value={customService.unit} 
                    onChangeText={v => setCustomService({...customService, unit: v as any})} 
                  />
                </View>

                <View style={styles.modeToggle}>
                  <TouchableOpacity 
                    onPress={() => setCustomService({...customService, materialMode: 'estimated'})} 
                    style={[
                      styles.modeBtn, 
                      customService.materialMode === 'estimated' ? { backgroundColor: colors.accent } : { backgroundColor: colors.border }
                    ]}
                  >
                    <Text style={[styles.modeBtnText, { color: customService.materialMode === 'estimated' ? '#fff' : colors.textSecondary }]}>RYCZAŁT MAT.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setCustomService({...customService, materialMode: 'detailed'})} 
                    style={[
                      styles.modeBtn, 
                      customService.materialMode === 'detailed' ? { backgroundColor: colors.accent } : { backgroundColor: colors.border }
                    ]}
                  >
                    <Text style={[styles.modeBtnText, { color: customService.materialMode === 'detailed' ? '#fff' : colors.textSecondary }]}>LISTA MAT.</Text>
                  </TouchableOpacity>
                </View>

                {customService.materialMode === 'estimated' ? (
                  <TextInput 
                    placeholder="Cena materiału na jm" 
                    placeholderTextColor={colors.textMuted}
                    style={[styles.simpleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                    keyboardType="numeric" 
                    onChangeText={v => setCustomService({...customService, estimatedMaterialPrice: Number(v)})} 
                  />
                ) : (
                  <View style={[styles.innerCard, { backgroundColor: colors.surfaceSubtle }]}>
                    <TextInput 
                      placeholder="Nazwa materiału" 
                      placeholderTextColor={colors.textMuted}
                      style={[styles.simpleInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                      value={tempMaterial.name} 
                      onChangeText={v => setTempMaterial({...tempMaterial, name: v})} 
                    />
                    <View style={styles.row}>
                      <TextInput 
                        placeholder="Cena" 
                        placeholderTextColor={colors.textMuted}
                        style={[styles.simpleInput, { flex: 1, marginRight: 5, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                        keyboardType="numeric" 
                        value={tempMaterial.price?.toString()} 
                        onChangeText={v => setTempMaterial({...tempMaterial, price: Number(v)})} 
                      />
                      <TextInput 
                        placeholder="Zużycie/jm" 
                        placeholderTextColor={colors.textMuted}
                        style={[styles.simpleInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} 
                        keyboardType="numeric" 
                        value={tempMaterial.consumption?.toString()} 
                        onChangeText={v => setTempMaterial({...tempMaterial, consumption: Number(v)})} 
                      />
                    </View>
                    <TouchableOpacity style={[styles.addMatBtn, { backgroundColor: colors.textSecondary }]} onPress={addMaterialToCustom}>
                      <Plus size={14} color="#fff" />
                      <Text style={styles.addMatBtnText}>DODAJ MATERIAŁ</Text>
                    </TouchableOpacity>
                    {customService.materials?.map(m => <Text key={m.id} style={[styles.matListText, { color: colors.textSecondary }]}>• {m.name} ({m.price}zł x {m.consumption})</Text>)}
                  </View>
                )}

                <TouchableOpacity style={[styles.addServiceBtn, { backgroundColor: colors.accent }]} onPress={() => addServiceToQuote()}>
                  <Text style={styles.addServiceBtnText}>DODAJ DO WYCENY</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.cardLabel, { marginTop: 10, color: colors.textMuted }]}>LUB WYBIERZ Z KATALOGU</Text>
              {services.map(s => (
                <TouchableOpacity 
                  key={s.id} 
                  onPress={() => addServiceToQuote(s)} 
                  style={[styles.serviceItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, flex: 1, fontWeight: '700' }}>{s.name}</Text>
                  <Plus size={20} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* KROK 3: PODSUMOWANIE */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Podsumowanie</Text>

              {selectedItems.map((item, idx) => {
                const res = calculateItemTotal(item);
                return (
                  <View key={item.id} style={[styles.summaryItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.sumName, { color: colors.text }]}>{idx+1}. {item.name}</Text>
                      <TouchableOpacity onPress={() => setSelectedItems(selectedItems.filter(i => i.id !== item.id))}>
                        <Trash2 size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.sumDetailRow}>
                      <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Ilość (metraż):</Text>
                      <TextInput
                        style={[styles.sumInput, { color: colors.text, borderBottomColor: colors.accent }]}
                        keyboardType="numeric"
                        value={item.quantity.toString()}
                        onChangeText={v => {
                          const newItems = [...selectedItems];
                          newItems[idx].quantity = Number(v);
                          setSelectedItems(newItems);
                        }}
                      />
                      <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>{item.unit}</Text>
                    </View>

                    <View style={[styles.sumInfoRow, { borderTopColor: colors.border }]}>
                      <Text style={[styles.sumSubLabel, { color: colors.textMuted }]}>Robocizna: {item.netPrice * item.quantity} zł</Text>
                      <Text style={[styles.sumSubLabel, { color: colors.textMuted }]}>Materiał: {res.net - (item.netPrice * item.quantity)} zł</Text>
                    </View>
                    <Text style={[styles.sumTotal, { color: colors.accent }]}>Suma pozycji: {res.gross.toFixed(2)} zł</Text>
                  </View>
                );
              })}

              <View style={[styles.totalBox, { backgroundColor: colors.primary }]}>
                <Text style={styles.totalLabel}>ŁĄCZNIE DO ZAPŁATY (BRUTTO)</Text>
                <Text style={[styles.totalValue, { color: colors.textInverted }]}>{getFinalTotals().gross.toLocaleString()} zł</Text>
              </View>
            </View>
          )}

        </ScrollView>

        {/* STOPKA NAWIGACJI */}
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 }]}>
          {step > 1 && (
             <TouchableOpacity 
              style={[styles.navBtn, styles.navBtnBack, { backgroundColor: colors.surfaceSubtle }]} 
              onPress={() => setStep(step - 1)}
            >
              <ChevronLeft color={colors.textSecondary} />
              <Text style={[styles.navBtnBackText, { color: colors.textSecondary }]}>WSTECZ</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnNext, { backgroundColor: step === 3 ? colors.success : colors.accent }]}
            onPress={() => {
                if (step === 1) {
                    if (!clientInfo.firstName || !clientInfo.phone || !clientInfo.serviceCity) {
                        showToast('Uzupełnij wymagane pola klienta', 'error');
                        return;
                    }
                    setStep(2);
                } else if (step === 2) {
                    if (selectedItems.length === 0) {
                        showToast('Dodaj przynajmniej jedną usługę', 'error');
                        return;
                    }
                    setStep(3);
                } else {
                    handleFinalSave();
                }
            }}
          >
            <Text style={styles.navBtnNextText}>{step === 3 ? 'ZAPISZ I GENERUJ PDF' : 'DALEJ'}</Text>
            {step < 3 && <ChevronRight color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* MODAL KLIENTA */}
        <Modal visible={showClientPicker} animationType="slide">
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Wybierz klienta</Text>
              <TouchableOpacity onPress={() => setShowClientPicker(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {clients.map(c => (
                <TouchableOpacity key={c.id} style={[styles.clientPickerItem, { borderBottomColor: colors.border }]} onPress={() => handleSelectClient(c)}>
                  <Briefcase size={20} color={colors.textMuted} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontWeight: 'bold', color: colors.text }}>{c.firstName} {c.lastName}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{c.city}, {c.phone}</Text>
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

const CustomInput = ({ label, colors, styles, ...props }: any) => (
  <View style={styles.inputWrapper}>
    <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    <TextInput 
      style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]} 
      placeholderTextColor={colors.textMuted}
      {...props} 
    />
  </View>
);

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 40 : 16 },
  stepIndicator: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepDotActive: { width: 24 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  stepContainer: { gap: 20 },
  sectionTitle: { fontSize: 26, fontWeight: '900' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: 24, padding: 20, borderWidth: 1, elevation: 2 },
  cardLabel: { fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  inputWrapper: { marginBottom: 15 },
  label: { fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  input: { height: 45, borderBottomWidth: 1, fontSize: 16 },
  simpleInput: { height: 48, borderRadius: 12, paddingHorizontal: 15, marginBottom: 12, borderWidth: 1, fontSize: 14 },
  modeToggle: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  modeBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  modeBtnActive: { },
  modeBtnText: { fontWeight: 'bold', fontSize: 10 },
  innerCard: { padding: 15, borderRadius: 16, marginBottom: 10 },
  addMatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, alignSelf: 'flex-start' },
  addMatBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  matListText: { fontSize: 11, marginTop: 5, fontStyle: 'italic' },
  addServiceBtn: { padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  addServiceBtnText: { color: '#fff', fontWeight: 'bold' },
  serviceItem: { flexDirection: 'row', padding: 18, borderRadius: 18, marginBottom: 10, borderWidth: 1 },
  summaryItem: { padding: 20, borderRadius: 24, marginBottom: 12, borderWidth: 1 },
  sumName: { fontSize: 16, fontWeight: 'bold' },
  sumDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 },
  sumInput: { width: 60, height: 40, borderBottomWidth: 2, textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  sumLabel: { fontWeight: 'bold' },
  sumInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 10, borderTopWidth: 1 },
  sumSubLabel: { fontSize: 11 },
  sumTotal: { fontSize: 16, fontWeight: '900', marginTop: 10, textAlign: 'right' },
  totalBox: { padding: 30, borderRadius: 28, alignItems: 'center', marginVertical: 20 },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  totalValue: { fontSize: 36, fontWeight: '900', marginTop: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, flexDirection: 'row', gap: 10 },
  navBtn: { flex: 2, height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  navBtnBack: { flex: 1 },
  navBtnNext: { },
  navBtnBackText: { fontWeight: 'bold' },
  navBtnNextText: { color: '#fff', fontWeight: '900' },
  modalContent: { flex: 1, padding: 20, paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  clientPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkBtnText: { fontWeight: 'bold', fontSize: 12 },
  outlineAction: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  outlineActionText: { fontWeight: 'bold', fontSize: 12 }
});

export default NewQuote;
