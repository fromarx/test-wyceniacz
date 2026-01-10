import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Switch,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../store/AppContext';
import { 
  Plus, Search, ChevronRight, X, Ruler, Package, Check, 
  ChevronLeft, ShoppingCart, Calculator, Trash2, ChevronDown, 
  ChevronUp, Edit3 
} from 'lucide-react-native';
import { 
  Quote, QuoteItem, QuoteStatus, Service, UnitOfMeasure, 
  MaterialItem, MaterialMode, Client 
} from '../types';

// Typowanie parametrów trasy
type RootStackParamList = {
  NewQuote: { id?: string };
  QuoteDetails: { id: string };
};

interface SelectionState {
  name: string;
  quantity: number;
  laborPrice: number;
  unit: UnitOfMeasure;
  vatRate: number;
  materialMode: MaterialMode;
  estimatedMaterialPrice: number;
  materials: MaterialItem[];
  isCustom?: boolean;
}

const NewQuote: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NewQuote'>>();
  const id = route.params?.id;

  const { state, addQuote, updateQuote } = useAppContext();
  const { darkMode, clients, services } = state;
  
  const isEditMode = !!id;
  const existingQuote = useMemo(() => isEditMode ? state.quotes.find(q => q.id === id) : null, [id, state.quotes]);

  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [apartmentArea, setApartmentArea] = useState<string>('0');
  const [includeMaterials, setIncludeMaterials] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMaterials, setExpandedMaterials] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  
  const [clientInfo, setClientInfo] = useState({
    clientId: '', firstName: '', lastName: '', phone: '', email: '', 
    clientCompany: '', clientNip: '', serviceStreet: '', serviceHouseNo: '', 
    serviceApartmentNo: '', servicePostalCode: '', serviceCity: '',
    estimatedCompletionDate: ''
  });

  const [selectedItems, setSelectedItems] = useState<Record<string, SelectionState>>({});

  // Efekt ładowania danych przy edycji
  useEffect(() => {
    if (isEditMode && existingQuote) {
      setClientInfo({
        clientId: existingQuote.clientId || '',
        firstName: existingQuote.clientFirstName,
        lastName: existingQuote.clientLastName,
        phone: existingQuote.clientPhone,
        email: existingQuote.clientEmail || '',
        clientCompany: existingQuote.clientCompany || '',
        clientNip: existingQuote.clientNip || '',
        serviceStreet: existingQuote.serviceStreet,
        serviceHouseNo: existingQuote.serviceHouseNo,
        serviceApartmentNo: existingQuote.serviceApartmentNo || '',
        servicePostalCode: existingQuote.servicePostalCode,
        serviceCity: existingQuote.serviceCity,
        estimatedCompletionDate: existingQuote.estimatedCompletionDate || ''
      });

      const itemsMap: Record<string, SelectionState> = {};
      existingQuote.items.forEach((item, index) => {
        const key = item.serviceId === 'custom' ? `custom_${index}` : item.serviceId;
        itemsMap[key] = {
          name: item.name,
          quantity: item.quantity,
          laborPrice: item.netPrice,
          unit: item.unit,
          vatRate: item.vatRate,
          materialMode: item.materialMode,
          estimatedMaterialPrice: item.estimatedMaterialPrice || 0,
          materials: item.materials,
          isCustom: item.serviceId === 'custom'
        };
      });
      setSelectedItems(itemsMap);
    }
  }, [isEditMode, existingQuote]);

  const handleNextStep = () => {
    if (!clientInfo.firstName || !clientInfo.lastName || !clientInfo.serviceCity) {
      Alert.alert("Błąd", "Wypełnij wymagane pola klienta.");
      return;
    }
    setStep(step + 1);
  };

  const toggleService = (s: Service) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[s.id]) {
        delete newItems[s.id];
      } else {
        newItems[s.id] = { 
          name: s.name, unit: s.unit, vatRate: s.vatRate, quantity: 1, 
          laborPrice: s.netPrice, materialMode: 'estimated', 
          estimatedMaterialPrice: s.estimatedMaterialPrice || 0, 
          materials: s.defaultMaterials || []
        };
      }
      return newItems;
    });
  };

  const calculateTotals = () => {
    let net = 0; let vat = 0;
    Object.values(selectedItems).forEach(item => {
      const labor = item.laborPrice * item.quantity;
      const mat = includeMaterials ? (item.materialMode === 'estimated' ? item.estimatedMaterialPrice * item.quantity : 0) : 0;
      const itemNet = labor + mat;
      net += itemNet;
      vat += itemNet * (item.vatRate / 100);
    });
    return { net, vat, gross: net + vat };
  };

  const handleSave = () => {
    const totals = calculateTotals();
    const allItems: QuoteItem[] = Object.entries(selectedItems).map(([key, data]) => ({
      id: Math.random().toString(),
      serviceId: data.isCustom ? 'custom' : key,
      name: data.name,
      quantity: data.quantity,
      netPrice: data.laborPrice,
      vatRate: data.vatRate,
      unit: data.unit,
      materialMode: data.materialMode,
      estimatedMaterialPrice: data.estimatedMaterialPrice,
      materials: data.materials
    }));

    if (isEditMode && existingQuote) {
      updateQuote({ ...existingQuote, ...clientInfo, items: allItems, ...totals });
    } else {
      const newQuote: Quote = {
        id: Math.random().toString(),
        number: `WYC/${new Date().getFullYear()}/${state.quotes.length + 1}`,
        date: new Date().toLocaleDateString('pl-PL'),
        status: QuoteStatus.DRAFT,
        ...clientInfo,
        items: allItems,
        totalNet: totals.net,
        totalVat: totals.vat,
        totalGross: totals.gross,
        clientFirstName: clientInfo.firstName,
        clientLastName: clientInfo.lastName,
        clientPhone: clientInfo.phone,
        clientEmail: clientInfo.email,
        clientCompany: clientInfo.clientCompany,
        serviceStreet: clientInfo.serviceStreet,
        serviceHouseNo: clientInfo.serviceHouseNo,
        serviceApartmentNo: clientInfo.serviceApartmentNo,
        servicePostalCode: clientInfo.servicePostalCode,
        serviceCity: clientInfo.serviceCity
      };
      addQuote(newQuote);
    }
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
          <ChevronLeft color={darkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: darkMode ? '#fff' : '#000' }]}>
          {isEditMode ? 'Edycja Wyceny' : 'Nowa Wycena'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.sectionTitle, { color: darkMode ? '#f1f5f9' : '#1e293b' }]}>Dane Zleceniodawcy</Text>
            <View style={[styles.card, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
              <CustomInput label="Imię" value={clientInfo.firstName} onChangeText={v => setClientInfo({...clientInfo, firstName: v})} darkMode={darkMode} />
              <CustomInput label="Nazwisko" value={clientInfo.lastName} onChangeText={v => setClientInfo({...clientInfo, lastName: v})} darkMode={darkMode} />
              <CustomInput label="Telefon" value={clientInfo.phone} onChangeText={v => setClientInfo({...clientInfo, phone: v})} darkMode={darkMode} keyboardType="phone-pad" />
              <CustomInput label="Miejscowość" value={clientInfo.serviceCity} onChangeText={v => setClientInfo({...clientInfo, serviceCity: v})} darkMode={darkMode} />
              <CustomInput label="Ulica i numer" value={clientInfo.serviceStreet} onChangeText={v => setClientInfo({...clientInfo, serviceStreet: v})} darkMode={darkMode} />
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
              <Text style={styles.buttonText}>DALEJ DO USŁUG</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.sectionTitle, { color: darkMode ? '#f1f5f9' : '#1e293b' }]}>Katalog Usług</Text>
            <TextInput 
              style={[styles.searchInput, { backgroundColor: darkMode ? '#0f172a' : '#fff', color: darkMode ? '#fff' : '#000' }]}
              placeholder="Szukaj usługi..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => {
              const isSelected = !!selectedItems[s.id];
              return (
                <TouchableOpacity 
                  key={s.id} 
                  onPress={() => toggleService(s)}
                  style={[styles.serviceItem, { backgroundColor: isSelected ? '#2563eb' : (darkMode ? '#0f172a' : '#fff') }]}
                >
                  <Text style={{ color: isSelected ? '#fff' : (darkMode ? '#cbd5e1' : '#334155'), fontWeight: 'bold' }}>{s.name}</Text>
                  <Plus size={20} color={isSelected ? '#fff' : '#2563eb'} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(3)}>
              <Text style={styles.buttonText}>PODSUMOWANIE ({Object.keys(selectedItems).length})</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
             <Text style={[styles.sectionTitle, { color: darkMode ? '#f1f5f9' : '#1e293b' }]}>Podsumowanie</Text>
             {Object.entries(selectedItems).map(([key, item]) => (
               <View key={key} style={[styles.card, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
                 <Text style={{ color: darkMode ? '#fff' : '#000', fontWeight: 'bold' }}>{item.name}</Text>
                 <View style={styles.row}>
                    <Text style={{ color: '#64748b' }}>Ilość: {item.quantity} {item.unit}</Text>
                    <Text style={{ color: darkMode ? '#fff' : '#000' }}>{item.laborPrice} zł</Text>
                 </View>
               </View>
             ))}
             <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Suma Brutto:</Text>
                <Text style={styles.totalValue}>{calculateTotals().gross.toLocaleString()} zł</Text>
             </View>
             <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#10b981' }]} onPress={handleSave}>
              <Text style={styles.buttonText}>ZAPISZ WYCENĘ</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Pomocniczy komponent Inputa
const CustomInput = ({ label, darkMode, ...props }: any) => (
  <View style={styles.inputWrapper}>
    <Text style={[styles.label, { color: darkMode ? '#64748b' : '#94a3b8' }]}>{label}</Text>
    <TextInput 
      style={[styles.input, { color: darkMode ? '#fff' : '#000', borderBottomColor: darkMode ? '#1e293b' : '#e2e8f0' }]} 
      {...props} 
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16 },
  stepContainer: { gap: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  inputWrapper: { gap: 4 },
  label: { fontSize: 10, fontWeight: 'bold', uppercase: true },
  input: { height: 40, borderBottomWidth: 1, fontSize: 16, paddingVertical: 8 },
  searchInput: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 14, marginBottom: 8 },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  primaryButton: { backgroundColor: '#2563eb', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  totalBox: { padding: 20, backgroundColor: '#1e293b', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#94a3b8', fontWeight: 'bold' },
  totalValue: { color: '#fff', fontSize: 20, fontWeight: '900' }
});

export default NewQuote;