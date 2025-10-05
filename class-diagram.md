# Class Diagram - Hệ thống Tìm phòng trọ và Ghép phòng

## Tổng quan
Class diagram này mô tả cấu trúc dữ liệu và mối quan hệ giữa các entity trong hệ thống tìm phòng trọ và ghép phòng, dựa trên các schema MongoDB đã được implement.

## Class Diagram

```mermaid
classDiagram
    %% Core User Management
    class User {
        +number userId
        +string name
        +string email
        +string password
        +string avatar
        +string phone
        +string role
        +boolean isEmailVerified
        +Date emailVerifiedAt
        +boolean isVerified
        +number verificationId
        +Date createdAt
        +Date updatedAt
        +login(credentials: LoginDto): Promise<{access_token: string, user: User}>
        +changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<void>
        +update(userId: number, updateUserDto: UpdateUserDto): Promise<User>
        +getVerificationStatus(userId: number): Promise<VerificationStatus>
        +findOne(userId: number): Promise<User>
        +findAll(): Promise<User[]>
        +remove(userId: number): Promise<void>
        +getMyRooms(userId: number): Promise<Room[]>
    }

    class UserProfile {
        +number profileId
        +number userId
        +Date dateOfBirth
        +string gender
        +string occupation
        +number income
        +string currentLocation
        +string preferredCity
        +string[] preferredWards
        +BudgetRange budgetRange
        +string[] roomType
        +string[] amenities
        +string lifestyle
        +boolean smoking
        +boolean pets
        +number cleanliness
        +number socialLevel
        +string businessType
        +string experience
        +number propertiesCount
        +string[] propertyTypes
        +string targetCity
        +string[] targetWards
        +PriceRange priceRange
        +string[] targetTenants
        +string managementStyle
        +string responseTime
        +string[] additionalServices
        +string businessLicense
        +string[] contactMethod
        +AvailableTime availableTime
        +boolean isBasicInfoComplete
        +boolean isPreferencesComplete
        +boolean isLandlordInfoComplete
        +number completionPercentage
        +update(userId: number, updateUserProfileDto: UpdateUserProfileDto): Promise<UserProfile>
        +findByUserId(userId: number): Promise<UserProfile>
        +findAll(): Promise<UserProfile[]>
        +findByCompletion(minPercentage: number): Promise<UserProfile[]>
        +findByRole(role: string): Promise<UserProfile[]>
        +remove(userId: number): Promise<void>
    }

    class Admin {
        +number adminId
        +string username
        +string email
        +string password
        +string role
        +Date createdAt
        +Date updatedAt
    }

    %% Address Management
    class Address {
        +string street
        +string ward
        +string city
        +string specificAddress
        +boolean showSpecificAddress
        +string provinceCode
        +string provinceName
        +string wardCode
        +string wardName
        +string additionalInfo
    }

    %% Building and Room Management
    class Building {
        +number buildingId
        +number landlordId
        +string name
        +Address address
        +number totalRooms
        +string buildingType
        +string[] images
        +string description
        +boolean isActive
        +Date createdAt
        +Date updatedAt
    }

    class Room {
        +number roomId
        +number landlordId
        +number buildingId
        +string roomNumber
        +string category
        +number area
        +number price
        +number deposit
        +string furniture
        +ChungCuInfo chungCuInfo
        +NhaNguyenCanInfo nhaNguyenCanInfo
        +Utilities utilities
        +UtilityType[] availableUtilities
        +Address address
        +number maxOccupancy
        +boolean canShare
        +number sharePrice
        +number currentOccupants
        +number availableSpots
        +string shareMethod
        +number estimatedMonthlyUtilities
        +number capIncludedAmount
        +CurrentTenant[] currentTenants
        +string[] images
        +string[] videos
        +string description
        +string status
        +boolean isActive
        +Date createdAt
        +Date updatedAt
        +createRoom(landlordId: number, roomData: CreateRoomDto): Promise<Room>
        +getRoomsByLandlord(landlordId: number): Promise<Room[]>
        +getRoomsByBuilding(buildingId: number, landlordId: number): Promise<Room[]>
        +getRoomById(roomId: number, landlordId?: number): Promise<Room>
        +updateRoom(roomId: number, updateData: UpdateRoomDto, landlordId: number): Promise<Room>
        +deleteRoom(roomId: number, landlordId: number): Promise<void>
        +addTenantToRoom(roomId: number, tenantData: AddTenantDto, landlordId: number): Promise<Room>
        +removeTenantFromRoom(roomId: number, userId: number, landlordId: number): Promise<void>
        +getRoomTenants(roomId: number, landlordId: number): Promise<CurrentTenant[]>
        +searchRooms(filters: any): Promise<Room[]>
    }

    class ChungCuInfo {
        +string buildingName
        +string blockOrTower
        +number floorNumber
        +string unitCode
        +string propertyType
        +number bedrooms
        +number bathrooms
        +string direction
        +string legalStatus
    }

    class NhaNguyenCanInfo {
        +string khuLo
        +string unitCode
        +string propertyType
        +number bedrooms
        +number bathrooms
        +string direction
        +number totalFloors
        +string legalStatus
        +string furniture
        +string[] features
        +number landArea
        +number usableArea
        +number width
        +number length
    }

    class Utilities {
        +number electricityPricePerKwh
        +number waterPrice
        +string waterBillingType
        +number internetFee
        +number garbageFee
        +number cleaningFee
        +number parkingMotorbikeFee
        +number parkingCarFee
        +number managementFee
        +string managementFeeUnit
        +number gardeningFee
        +number cookingGasFee
        +IncludedInRent includedInRent
    }

    class IncludedInRent {
        +boolean electricity
        +boolean water
        +boolean internet
        +boolean garbage
        +boolean cleaning
        +boolean parkingMotorbike
        +boolean parkingCar
        +boolean managementFee
    }

    class CurrentTenant {
        +number userId
        +string fullName
        +Date dateOfBirth
        +string gender
        +string occupation
        +Date moveInDate
        +string lifestyle
        +string cleanliness
    }

    %% Post Management
    class Post {
        +number postId
        +number userId
        +string postType
        +string category
        +string title
        +string description
        +string[] images
        +string[] videos
        +number roomId
        +number buildingId
        +number landlordId
        +boolean isManaged
        +string source
        +RoomInfo roomInfo
        +PersonalInfo personalInfo
        +Requirements requirements
        +string phone
        +string email
        +string status
        +Date createdAt
        +Date updatedAt
        +createPost(userId: number, postData: CreatePostDto): Promise<Post>
        +getPosts(filters: SearchPostsDto): Promise<Post[]>
        +searchPosts(searchFilters: SearchPostsDto): Promise<Post[]>
        +getPostById(postId: number): Promise<Post>
        +getPostWithRoomInfo(postId: number): Promise<Post>
        +getUserRooms(userId: number, postType?: string): Promise<Post[]>
        +getPostsByUser(userId: number): Promise<Post[]>
        +updatePost(postId: number, updateData: UpdatePostDto): Promise<Post>
        +deletePost(postId: number): Promise<void>
        +updatePostStatus(postId: number, status: string): Promise<Post>
        +getPostsByLandlord(landlordId: number): Promise<Post[]>
        +getPostsByRoom(roomId: number): Promise<Post[]>
    }

    class RoomInfo {
        +Address address
        +BasicInfo basicInfo
        +ChungCuInfo chungCuInfo
        +NhaNguyenCanInfo nhaNguyenCanInfo
        +Utilities utilities
    }

    class BasicInfo {
        +number area
        +number price
        +number deposit
        +string furniture
        +number bedrooms
        +number bathrooms
        +string direction
        +string legalStatus
    }

    class PersonalInfo {
        +string fullName
        +Date dateOfBirth
        +string gender
        +string occupation
        +string[] hobbies
        +string[] habits
        +string lifestyle
        +string cleanliness
    }

    class Requirements {
        +number[] ageRange
        +string gender
        +string[] traits
        +number maxPrice
    }

    %% Contract and Payment Management
    class RentalContract {
        +number contractId
        +number roomId
        +number landlordId
        +string contractType
        +string status
        +Date startDate
        +Date endDate
        +number monthlyRent
        +number deposit
        +string contractFile
        +Tenant[] tenants
        +RoomInfo roomInfo
        +Date createdAt
        +Date updatedAt
        +createContract(contractData: CreateContractDto & {landlordId: number}): Promise<RentalContract>
        +getContractsByLandlord(landlordId: number): Promise<RentalContract[]>
        +getContractById(contractId: number): Promise<RentalContract>
        +updateContract(contractId: number, updateData: any): Promise<RentalContract>
        +addTenantToContract(contractId: number, tenantData: any): Promise<RentalContract>
        +removeTenantFromContract(contractId: number, tenantId: number): Promise<RentalContract>
        +getUserContract(userId: number, contractId: number): Promise<RentalContract>
    }

    class RoomSharingRequest {
        +number requestId
        +number tenantId
        +number landlordId
        +number roomId
        +number postId
        +string status
        +string message
        +string requestType
        +number posterId
        +Date requestedMoveInDate
        +number requestedDuration
        +string landlordResponse
        +Date respondedAt
        +number contractId
        +Date createdAt
        +Date updatedAt
    }

    class RoomSharingContract {
        +number contractId
        +number roomId
        +number landlordId
        +string contractType
        +string status
        +Date startDate
        +Date endDate
        +number monthlyRent
        +number deposit
        +string contractFile
        +Tenant[] tenants
        +RoomInfo roomInfo
        +Date createdAt
        +Date updatedAt
        +createContract(contractData: CreateContractDto): Promise<RoomSharingContract>
        +updateContract(updateData: any): Promise<RoomSharingContract>
        +addTenant(tenantData: any): Promise<RoomSharingContract>
        +removeTenant(tenantId: number): Promise<RoomSharingContract>
        +generatePDF(): Promise<string>
        +isActive(): boolean
        +getRemainingDays(): number
        +approveByUser(userId: number): Promise<RoomSharingContract>
        +rejectByUser(userId: number): Promise<RoomSharingContract>
    }

    class Tenant {
        +number tenantId
        +Date moveInDate
        +number monthlyRent
        +number deposit
        +string status
        +Date leftDate
    }

    class RentalRequest {
        +number requestId
        +number tenantId
        +number landlordId
        +number roomId
        +number postId
        +string status
        +string message
        +string requestType
        +number posterId
        +Date requestedMoveInDate
        +number requestedDuration
        +string landlordResponse
        +Date respondedAt
        +number contractId
        +Date createdAt
        +Date updatedAt
    }

    class Invoice {
        +number invoiceId
        +number tenantId
        +number landlordId
        +number roomId
        +number contractId
        +string invoiceType
        +number amount
        +Date dueDate
        +Date paidDate
        +string status
        +string paymentMethod
        +string description
        +string[] attachments
        +Object[] items
        +Date createdAt
        +Date updatedAt
        +createInvoice(invoiceData: CreateInvoiceDto): Promise<Invoice>
        +updateStatus(status: string, paymentMethod?: string): Promise<Invoice>
        +markAsPaid(paymentMethod: string): Promise<Invoice>
        +isOverdue(): boolean
        +getDaysUntilDue(): number
        +generateQRCode(): Promise<ZaloPayQRData>
    }

    class PaymentOrder {
        +string orderId
        +number invoiceId
        +number tenantId
        +number landlordId
        +number amount
        +string orderType
        +string status
        +string qrCodeUrl
        +string qrCodeData
        +string paymentMethod
        +Date paidAt
        +Date expiryAt
        +boolean isQrGenerated
        +string zalopayOrderId
        +string zalopayTransactionId
        +string zalopayPaymentUrl
        +string zalopayStatus
        +Date createdAt
        +Date updatedAt
        +generateQRCode(): Promise<ZaloPayQRData>
        +confirmPayment(paymentMethod: string): Promise<PaymentStatus>
        +cancelOrder(): Promise<PaymentStatus>
        +isExpired(): boolean
        +regenerateQRCode(): Promise<ZaloPayQRData>
        +checkPaymentStatus(): Promise<PaymentStatus>
    }

    class PaymentAccount {
        +number paymentAccountId
        +number userId
        +string provider
        +string type
        +string externalAccountId
        +string accountToken
        +string accountMask
        +string bankCode
        +string status
        +string[] capabilities
        +boolean isDefault
        +Date consentAt
        +string consentVersion
        +Date linkedAt
        +Date revokedAt
        +Date updatedAt
    }

    class ZaloPayQRData {
        +string orderId
        +string qrCodeUrl
        +string qrCodeData
        +Date expiryAt
        +number amount
        +boolean isZaloPayQR
        +string zalopayOrderId
    }

    class PaymentStatus {
        +string orderId
        +string status
        +Date paidAt
        +string paymentMethod
        +boolean isExpired
        +string message
    }

    %% Verification and Favourites
    class Verification {
        +number verificationId
        +number userId
        +string status
        +Date submittedAt
        +Date reviewedAt
        +number reviewedBy
        +string idNumber
        +string fullName
        +Date dateOfBirth
        +string gender
        +Date issueDate
        +string issuePlace
        +string adminNote
        +FaceMatchResult faceMatchResult
        +Date createdAt
        +Date updatedAt
        +create(userId: number, createVerificationDto: CreateVerificationDto): Promise<Verification>
        +findAll(status?: string, page?: number, limit?: number): Promise<{verifications: Verification[], total: number, page: number, limit: number}>
        +findByUserId(userId: number): Promise<Verification[]>
        +updateStatus(id: number, adminId: number, updateVerificationDto: UpdateVerificationDto): Promise<Verification>
    }

    class FaceMatchResult {
        +boolean match
        +number similarity
        +string confidence
    }

    class Favourite {
        +number favouriteId
        +number userId
        +string postType
        +number postId
        +Date createdAt
        +addToFavourites(userId: number, postId: number, postType: string): Promise<Favourite>
        +removeFromFavourites(userId: number, postId: number, postType: string): Promise<void>
        +isFavourited(userId: number, postId: number): Promise<boolean>
        +getUserFavourites(userId: number): Promise<Favourite[]>
    }

    class ContractUpdate {
        +number contractId
        +string updateType
        +Object updateData
        +number updatedBy
        +string reason
        +Date createdAt
    }

    %% Email Verification
    class EmailVerification {
        +number verificationId
        +string email
        +string otp
        +Date expiresAt
        +boolean isUsed
        +Date createdAt
    }

    %% Value Objects
    class BudgetRange {
        +number min
        +number max
    }

    class PriceRange {
        +number min
        +number max
    }

    class AvailableTime {
        +string weekdays
        +string weekends
    }

    %% Relationships
    User ||--o{ UserProfile : "has profile"
    User ||--o{ PaymentAccount : "has payment methods"
    User ||--o{ Post : "creates"
    User ||--o{ Building : "owns"
    User ||--o{ Room : "manages"
    User ||--o{ RentalRequest : "makes"
    User ||--o{ RoomSharingRequest : "makes"
    User ||--o{ RentalContract : "participates"
    User ||--o{ RoomSharingContract : "participates"
    User ||--o{ Invoice : "receives"
    User ||--o{ Favourite : "creates"
    User ||--o{ Verification : "submits"
    User ||--o{ PaymentOrder : "creates"

    UserProfile ||--|| User : "belongs to"

    Building ||--o{ Room : "contains"
    Building ||--|| User : "owned by"

    Room ||--o{ RentalContract : "has contracts"
    Room ||--o{ Post : "featured in"
    Room ||--o{ RentalRequest : "requested for"
    Room ||--|| Building : "located in"
    Room ||--|| User : "managed by"

    Post ||--o{ RentalRequest : "generates"
    Post ||--o{ Favourite : "favorited"
    Post ||--o| Room : "references"

    RentalContract ||--o{ Invoice : "generates"
    RentalContract ||--o{ Tenant : "includes"
    RentalContract ||--|| Room : "for room"
    RentalContract ||--o{ ContractUpdate : "has updates"

    RoomSharingContract ||--o{ Invoice : "generates"
    RoomSharingContract ||--o{ Tenant : "includes"
    RoomSharingContract ||--|| Room : "for room"
    RoomSharingContract ||--o{ ContractUpdate : "has updates"

    RentalRequest ||--o| RentalContract : "creates"
    RentalRequest ||--|| User : "made by"
    RentalRequest ||--|| User : "responded by"
    RentalRequest ||--|| Room : "for room"

    RoomSharingRequest ||--o| RoomSharingContract : "creates"
    RoomSharingRequest ||--|| User : "made by"
    RoomSharingRequest ||--|| User : "responded by"
    RoomSharingRequest ||--|| Room : "for room"

    Invoice ||--o{ PaymentOrder : "paid via"
    Invoice ||--|| RentalContract : "for contract"
    Invoice ||--|| RoomSharingContract : "for contract"
    Invoice ||--|| User : "paid by"
    Invoice ||--o{ ZaloPayQRData : "generates"
    Invoice ||--o{ PaymentStatus : "has status"

    PaymentOrder ||--|| Invoice : "pays"
    PaymentOrder ||--o{ ZaloPayQRData : "generates"
    PaymentOrder ||--o{ PaymentStatus : "has status"

    Verification ||--|| User : "submitted by"
    Verification ||--o| Admin : "reviewed by"

    Favourite ||--|| User : "created by"
    Favourite ||--|| Post : "favorites"

    EmailVerification ||--|| User : "verifies"
```

## Mô tả các Class chính

### 1. User Management
- **User**: Thông tin cơ bản của người dùng (user, landlord, admin)
- **UserProfile**: Hồ sơ chi tiết với preferences, thông tin kinh doanh
- **Admin**: Quản trị viên hệ thống

### 2. Property Management
- **Building**: Tòa nhà/chung cư
- **Room**: Phòng trọ với thông tin chi tiết
- **Address**: Địa chỉ chuẩn hóa

### 3. Post Management
- **Post**: Bài đăng cho thuê hoặc tìm ở ghép
- **RoomInfo**: Thông tin phòng trong bài đăng
- **PersonalInfo**: Thông tin cá nhân cho bài tìm ở ghép
- **Requirements**: Yêu cầu cho người ở ghép

### 4. Contract & Payment
- **RentalContract**: Hợp đồng thuê phòng (cho thuê thông thường)
- **RoomSharingContract**: Hợp đồng ở ghép (room sharing)
- **RentalRequest**: Yêu cầu thuê phòng
- **RoomSharingRequest**: Yêu cầu ở ghép
- **Invoice**: Hóa đơn thanh toán
- **PaymentOrder**: Đơn thanh toán qua QR/ZaloPay
- **ZaloPayQRData**: Dữ liệu QR code ZaloPay
- **PaymentStatus**: Trạng thái thanh toán
- **ContractUpdate**: Lịch sử cập nhật hợp đồng

### 5. Verification & Favourites
- **Verification**: Xác minh danh tính KYC
- **Favourite**: Danh sách yêu thích
- **EmailVerification**: Xác thực email OTP

## Mối quan hệ chính

1. **User ↔ UserProfile**: 1-1 (mỗi user có 1 profile)
2. **User ↔ Building**: 1-n (1 landlord có nhiều tòa nhà)
3. **Building ↔ Room**: 1-n (1 tòa nhà có nhiều phòng)
4. **Room ↔ RentalContract**: 1-n (1 phòng có nhiều hợp đồng thuê)
5. **Room ↔ RoomSharingContract**: 1-n (1 phòng có nhiều hợp đồng ở ghép)
6. **User ↔ Post**: 1-n (1 user tạo nhiều bài đăng)
7. **Post ↔ Favourite**: 1-n (1 bài đăng được nhiều người yêu thích)
8. **RentalContract ↔ Invoice**: 1-n (1 hợp đồng có nhiều hóa đơn)
9. **RoomSharingContract ↔ Invoice**: 1-n (1 hợp đồng ở ghép có nhiều hóa đơn)
10. **Invoice ↔ PaymentOrder**: 1-n (1 hóa đơn có thể có nhiều đơn thanh toán)
11. **RentalRequest ↔ RentalContract**: 1-1 (1 yêu cầu thuê tạo 1 hợp đồng)
12. **RoomSharingRequest ↔ RoomSharingContract**: 1-1 (1 yêu cầu ở ghép tạo 1 hợp đồng)
13. **Invoice ↔ ZaloPayQRData**: 1-n (1 hóa đơn có thể có nhiều QR code)
14. **PaymentOrder ↔ PaymentStatus**: 1-1 (1 đơn thanh toán có 1 trạng thái)

## Đặc điểm thiết kế

- **Flexible Schema**: Hỗ trợ nhiều loại bất động sản (chung cư, nhà nguyên căn, phòng trọ)
- **Room Sharing**: Hỗ trợ ở ghép với quản lý người ở hiện tại
- **Multi-tenant**: Một phòng có thể có nhiều người thuê
- **Payment Integration**: Tích hợp thanh toán QR/ZaloPay
- **KYC Verification**: Xác minh danh tính với AI face matching
- **Role-based**: Phân quyền user/landlord/admin
- **Audit Trail**: Timestamps và tracking cho tất cả entities

## Ghi chú về sự khác biệt BE/FE

### Tên class khác nhau:
- **BE**: `RentalContract` → **FE**: `Contract`
- **BE**: `Favourite` → **FE**: `Favorite`

### Class bổ sung từ FE:
- **RoomSharingRequest**: Yêu cầu ở ghép (khác với RentalRequest)
- **RoomSharingContract**: Hợp đồng ở ghép (khác với RentalContract)
- **ZaloPayQRData**: Dữ liệu QR code ZaloPay
- **PaymentStatus**: Trạng thái thanh toán chi tiết

### Field bổ sung trong User:
- **isVerified**: boolean (có trong cả BE và FE)
- **role**: string (có trong cả BE và FE)

### Mối quan hệ bổ sung:
- **RoomSharingRequest → RoomSharingContract**: 1-1
- **Invoice → ZaloPayQRData**: 1-n
- **Invoice → PaymentStatus**: 1-n
- **PaymentOrder → ZaloPayQRData**: 1-n
- **PaymentOrder → PaymentStatus**: 1-1
