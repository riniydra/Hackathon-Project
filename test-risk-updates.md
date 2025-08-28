# 🧪 Testing Real-Time Risk Score Updates

## ✅ **Implementation Complete!**

The risk score now updates in **real-time** when:
- ✅ New journals are created
- ✅ User logs in/out
- ✅ Manual refresh button is clicked

## 🚀 **How to Test**

### **Step 1: Start the Application**
```bash
pnpm dev
```
- Web app: http://127.0.0.1:3001
- API: http://127.0.0.1:8000

### **Step 2: Test Real-Time Updates**

1. **Login** to the application
2. **View initial risk score** (should be low for new users)
3. **Create a journal** with positive content:
   ```
   "I'm feeling happy and excited today. Everything is going great!"
   ```
4. **Watch the risk score** - it should remain low (green)
5. **Create a journal** with negative content:
   ```
   "I'm feeling sad and depressed. I hate everything."
   ```
6. **Watch the risk score** - it should increase (orange/warning)
7. **Create a journal** with concerning content:
   ```
   "I want to die. There's no point anymore."
   ```
8. **Watch the risk score** - it should become high (red)

### **Step 3: Test Manual Refresh**

1. Click the **🔄 Refresh** button in the Risk Insights section
2. The risk score should update immediately
3. You'll see "🔄 Updating..." while it loads

### **Step 4: Test Automatic Updates**

1. **Create multiple journals** in quick succession
2. **Watch the risk score** update automatically after each save
3. **Check the console** for API calls

## 🔍 **What's Happening Behind the Scenes**

### **Real-Time Flow:**
1. User creates journal → `save()` function called
2. Journal saved to database → `refresh()` function called
3. `refresh()` calls `insightsRef.current?.refreshRiskData()`
4. Risk evaluator analyzes recent 7 days of journals
5. New risk score calculated and displayed

### **Risk Score Calculation:**
- **Mood Analysis**: Positive vs negative words in recent journals
- **Language Analysis**: Concerning phrases and words
- **Weighted Scoring**: Each factor has different importance
- **Real-Time**: Always analyzes current data, not cached

### **Visual Feedback:**
- **Loading States**: Shows "Updating..." during refresh
- **Color Coding**: Green (low) → Orange (warning) → Red (high)
- **Score Display**: Percentage and decimal score
- **Factor Breakdown**: Shows individual feature scores

## 🎯 **Expected Results**

### **Low Risk (Green) - Score < 0.45**
- Positive language: "happy", "joy", "excited", "good"
- No concerning phrases
- Regular check-ins

### **Warning (Orange) - Score 0.45-0.65**
- Some negative language: "sad", "worried", "anxious"
- Mixed sentiment in recent journals
- Moderate safety concerns

### **High Risk (Red) - Score ≥ 0.65**
- Concerning language: "hate", "kill", "die", "suicide"
- Phrases like "want to die", "end it all"
- Multiple negative journals in short time

## 🔧 **Technical Details**

### **API Endpoints:**
- `GET /insights/risk` - Get current risk assessment
- `POST /journals/` - Create new journal (triggers risk update)

### **Frontend Components:**
- `InsightsPanel` - Displays risk data with refresh capability
- `Home` - Manages journal creation and risk updates
- `useRef` + `forwardRef` - Enables parent-child communication

### **Backend Analysis:**
- **Sentiment Analysis**: Word-based scoring (MVP)
- **Time Window**: Last 7 days of journals
- **Feature Weights**: Configurable in `risk_rules.yaml`
- **Real-Time**: No caching, always fresh data

## 🎉 **Success Indicators**

✅ Risk score updates immediately after journal creation
✅ Manual refresh button works
✅ Loading states provide visual feedback
✅ Color coding reflects risk levels
✅ Factor breakdown shows individual scores
✅ Console shows API calls being made

The system is now **truly real-time** and responsive to user input!
