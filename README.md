# Smart Home

Ứng dụng giám sát và điều khiển nhà thông minh. Giao diện web dùng React + Vite; API dùng Express; SQL Server lưu lịch sử cảm biến, trạng thái thiết bị, lịch hẹn và cài đặt. MQTT dùng để truyền dữ liệu thời gian thực giữa ứng dụng và thiết bị.

## Chức năng

- Giám sát nhiệt độ, độ ẩm, khói và chuyển động.
- Chọn phòng, xem và điều khiển các thiết bị đã khai báo trong ứng dụng.
- Tạo, bật/tắt và xóa lịch hẹn.
- Kết nối MQTT broker qua WebSocket từ trình duyệt.
- Lưu dữ liệu và cài đặt bằng SQL Server Express.
- Có chế độ mô phỏng để xem giao diện khi chưa có thiết bị thật.

## Yêu cầu

- Node.js và npm.
- SQL Server Express, với database `SmartHome`.
- MQTT broker có cả cổng MQTT TCP cho board (thường `1883`) và MQTT WebSocket cho trình duyệt (thường `9001`). Có thể dùng Mosquitto hoặc broker khác.
- Board ESP32/ESP8266 nếu muốn kết nối phần cứng. Mã ví dụ bên dưới dùng ESP32 và thư viện `PubSubClient` trong Arduino IDE.

## Chạy ứng dụng

1. Cài dependencies:

   ```bash
   npm install
   ```

2. Tạo database và bảng bằng cách mở `database/schema.sql` trong SSMS, kết nối tới `.\SQLEXPRESS` bằng Windows Authentication, rồi chạy script.

3. Sao chép `.env.example` thành `.env`. Cập nhật SQL host, port và database nếu cấu hình của bạn khác. Ứng dụng dùng tài khoản Windows của tiến trình Node.js; tài khoản đó cần quyền truy cập `SmartHome`.

   ```powershell
   Copy-Item .env.example .env
   ```

   SQL Server Express thường dùng cổng động nếu chưa cấu hình cổng cố định. Hãy bật TCP/IP và đặt cổng cố định, hoặc sửa `SQL_PORT` cho đúng cổng SQL Server đang lắng nghe.

4. Khởi động API và web:

   ```bash
   npm run dev
   ```

5. Mở `http://localhost:5173`. Kiểm tra API và SQL tại `http://localhost:4000/api/health`.

Các lệnh riêng:

```bash
npm run dev:web   # chỉ chạy giao diện
npm run dev:api   # chỉ chạy API
npm run build     # kiểm tra TypeScript và tạo bản build web
```

## MQTT: ứng dụng và thiết bị

SQL và MQTT làm hai việc khác nhau. SQL lưu dữ liệu; MQTT chuyển dữ liệu cảm biến và lệnh điều khiển. Kết nối SQL thành công không có nghĩa broker MQTT đã kết nối.

Trong mục **Kết nối** của ứng dụng nhập:

- **Địa chỉ IP broker:** IP máy đang chạy broker, có thể là `192.168.1.100` nếu đó đúng là IP của máy broker trên cùng mạng.
- **Cổng WebSocket:** cổng WebSocket của broker, ví dụ `9001`.
- **Đường dẫn WebSocket:** phải khớp cấu hình broker; ứng dụng mặc định dùng `/mqtt`.
- **Tiền tố topic:** mặc định `smarthome`.
- **Tên đăng nhập/mật khẩu:** nhập thông tin broker nếu broker bật xác thực; nếu không, để trống.
- **WSS/TLS:** bật khi broker dùng kết nối WebSocket bảo mật.

Trình duyệt kết nối tới broker bằng WebSocket. Board Arduino thường kết nối cùng broker bằng MQTT TCP, ví dụ cổng `1883`; không nhập cổng WebSocket `9001` vào firmware `PubSubClient`. Broker phải bật cả hai listener nếu muốn trình duyệt và board kết nối trực tiếp.

### Topic và dữ liệu ứng dụng

Với tiền tố mặc định `smarthome`, ứng dụng nhận:

| Hướng | Topic | Nội dung |
|---|---|---|
| Thiết bị → ứng dụng | `smarthome/sensors` | JSON có `temperature` và `humidity`; `smoke` và `motion` tùy chọn |
| Thiết bị → ứng dụng | `smarthome/device/<id>/state` | `ON` hoặc `OFF`; nên publish retained |
| Ứng dụng → thiết bị | `smarthome/device/<id>/set` | Lệnh `ON` hoặc `OFF` |
| Thiết bị → ứng dụng | `smarthome/alarm` | Cảnh báo JSON tùy chọn |

Ví dụ payload cảm biến:

```json
{"temperature":27.5,"humidity":62,"smoke":0,"motion":false}
```

Ứng dụng chấp nhận `temp`/`t` thay cho `temperature`, `hum`/`h` thay cho `humidity`, `gas`/`co2` thay cho `smoke`, và `pir` thay cho `motion`.

Các thiết bị hiện được khai báo sẵn trong `src/config/homeLayout.ts`; app không tự phát hiện thiết bị mới. ID dùng trong topic phải khớp ID trong danh sách, ví dụ `light-bedroom`, `fan-kitchen` hoặc `pump-garden`. Muốn thêm thiết bị mới, thêm thiết bị vào cấu hình phòng trước.

### Ví dụ firmware ESP32 cho Arduino IDE

Cài thư viện **PubSubClient** trong Library Manager. Sửa Wi-Fi, địa chỉ broker và thông tin xác thực bên dưới. Ví dụ dùng giá trị cảm biến giả để kiểm tra giao tiếp; thay phần đó bằng số đo từ cảm biến thực tế của bạn.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_NAME = "TEN_WIFI";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI";
const char* MQTT_HOST = "192.168.1.100";
const uint16_t MQTT_PORT = 1883; // MQTT TCP cho ESP32, không phải cổng WebSocket của trình duyệt
const char* MQTT_USER = "";      // để trống nếu broker không yêu cầu xác thực
const char* MQTT_PASSWORD = "";

const char* SENSOR_TOPIC = "smarthome/sensors";
const char* SET_TOPIC = "smarthome/device/light-bedroom/set";
const char* STATE_TOPIC = "smarthome/device/light-bedroom/state";
const int LED_PIN = 2; // đổi theo board/mạch relay của bạn

WiFiClient network;
PubSubClient mqtt(network);
unsigned long lastPublish = 0;

void publishState(const char* state) {
  mqtt.publish(STATE_TOPIC, state, true); // retained để app nhận trạng thái mới nhất
}

void onMessage(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != SET_TOPIC) return;

  String command;
  for (unsigned int i = 0; i < length; i++) command += (char)payload[i];
  command.trim();
  command.toUpperCase();

  if (command == "ON") {
    digitalWrite(LED_PIN, HIGH);
    publishState("ON");
  } else if (command == "OFF") {
    digitalWrite(LED_PIN, LOW);
    publishState("OFF");
  }
}

void connectWifi() {
  WiFi.begin(WIFI_NAME, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String clientId = "smarthome-esp32-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    bool connected = (MQTT_USER[0] == '\0')
      ? mqtt.connect(clientId.c_str())
      : mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD);

    if (connected) {
      mqtt.subscribe(SET_TOPIC);
      publishState(digitalRead(LED_PIN) ? "ON" : "OFF");
    } else {
      delay(2000);
    }
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  if (millis() - lastPublish >= 5000) {
    lastPublish = millis();
    // Thay các giá trị thử nghiệm này bằng dữ liệu cảm biến thật.
    char payload[128];
    snprintf(payload, sizeof(payload),
      "{\"temperature\":%.1f,\"humidity\":%.1f,\"smoke\":%d,\"motion\":%s}",
      27.5, 62.0, 0, "false");
    mqtt.publish(SENSOR_TOPIC, payload);
  }
}
```

Nạp sketch lên board, mở Serial Monitor để bổ sung log nếu cần, rồi kiểm tra trạng thái MQTT trong ứng dụng. Với ví dụ trên, app sẽ cập nhật cảm biến và trạng thái thiết bị có ID `light-bedroom`. Nếu broker không kết nối, kiểm tra IP/cổng, listener WebSocket, đường dẫn `/mqtt`, tài khoản broker và firewall.

## API chính

- `GET /api/health` — trạng thái kết nối database.
- `/api/telemetry` — lưu và đọc lịch sử cảm biến.
- `/api/devices` — đọc/cập nhật trạng thái thiết bị.
- `/api/schedules` — quản lý lịch hẹn.
- `/api/settings` — lưu cài đặt và ngưỡng cảnh báo.

## Lưu ý bảo mật

- Không commit `.env`; file này chứa cấu hình máy của bạn. Chỉ commit `.env.example`.
- Không mở broker cho Internet với anonymous access. Dùng tài khoản/mật khẩu và giới hạn truy cập trong mạng tin cậy.
- Không đấu LED/relay trực tiếp vào chân board nếu tải vượt giới hạn điện; dùng mạch driver/relay phù hợp.
