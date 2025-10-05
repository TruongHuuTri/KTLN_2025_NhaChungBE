---
config:
  layout: elk
---
classDiagram
direction TB
    class MoneyRange {
	    +min : number
	    +max : number
    }
    class AgeRange {
	    +min : number
	    +max : number
    }
    class TimeWindow {
	    +weekdays : string
	    +weekends : string
    }
    class User {
	    +userId : number
	    +name : string
	    +email : string
	    +password : string
	    +avatar : string
	    +phone : string
	    +role : string
	    +isEmailVerified : boolean
	    +emailVerifiedAt : Date
	    +isVerified : boolean
	    +verificationId : number
	    +createdAt : Date
	    +updatedAt : Date
	    +login(credentials: LoginDto) : LoginResult
	    +changePassword(userId: number, dto: ChangePasswordDto) : void
	    +update(userId: number, dto: UpdateUserDto) : User
	    +getVerificationStatus(userId: number) : VerificationStatus
	    +findOne(userId: number) : User
	    +findAll() : User[]
	    +remove(userId: number) : void
	    +getMyRooms(userId: number) : Room[]
    }
    class UserProfile {
	    +profileId : number
	    +userId : number
	    +dateOfBirth : Date
	    +gender : string
	    +occupation : string
	    +income : number
	    +currentLocation : string
	    +preferredCity : string
	    +preferredWards : string[]
	    +roomType : string[]
	    +amenities : string[]
	    +lifestyle : string
	    +smoking : boolean
	    +pets : boolean
	    +cleanliness : number
	    +socialLevel : number
	    +businessType : string
	    +experience : string
	    +propertiesCount : number
	    +propertyTypes : string[]
	    +targetCity : string
	    +targetWards : string[]
	    +targetTenants : string[]
	    +managementStyle : string
	    +responseTime : string
	    +additionalServices : string[]
	    +businessLicense : string
	    +contactMethod : string[]
	    +isBasicInfoComplete : boolean
	    +isPreferencesComplete : boolean
	    +isLandlordInfoComplete : boolean
	    +completionPercentage : number
	    +update(userId: number, dto: UpdateUserProfileDto) : UserProfile
	    +findByUserId(userId: number) : UserProfile
	    +findAll() : UserProfile[]
	    +findByCompletion(minPercent: number) : UserProfile[]
	    +findByRole(role: string) : UserProfile[]
	    +remove(userId: number) : void
    }
    class Admin {
	    +adminId : number
	    +username : string
	    +email : string
	    +password : string
	    +role : string
	    +createdAt : Date
	    +updatedAt : Date
    }
    class Address {
	    +street : string
	    +ward : string
	    +city : string
	    +specificAddress : string
	    +showSpecificAddress : boolean
	    +provinceCode : string
	    +provinceName : string
	    +wardCode : string
	    +wardName : string
	    +additionalInfo : string
    }
    class Building {
	    +buildingId : number
	    +landlordId : number
	    +name : string
	    +address : Address
	    +totalRooms : number
	    +buildingType : string
	    +images : string[]
	    +description : string
	    +isActive : boolean
	    +createdAt : Date
	    +updatedAt : Date
    }
    class Room {
	    +roomId : number
	    +landlordId : number
	    +buildingId : number
	    +roomNumber : string
	    +category : string
	    +area : number
	    +price : number
	    +deposit : number
	    +furniture : string
	    +availableUtilities : string[]
	    +address : Address
	    +maxOccupancy : number
	    +canShare : boolean
	    +sharePrice : number
	    +currentOccupants : number
	    +availableSpots : number
	    +shareMethod : string
	    +estimatedMonthlyUtilities : number
	    +capIncludedAmount : number
	    +images : string[]
	    +videos : string[]
	    +description : string
	    +status : string
	    +isActive : boolean
	    +createdAt : Date
	    +updatedAt : Date
	    +createRoom(landlordId: number, dto: CreateRoomDto) : Room
	    +getRoomsByLandlord(landlordId: number) : Room[]
	    +getRoomsByBuilding(buildingId: number, landlordId: number) : Room[]
	    +getRoomById(roomId: number, landlordId?: number) : Room
	    +updateRoom(roomId: number, dto: UpdateRoomDto, landlordId: number) : Room
	    +deleteRoom(roomId: number, landlordId: number) : void
	    +addTenantToRoom(roomId: number, dto: AddTenantDto, landlordId: number) : Room
	    +removeTenantFromRoom(roomId: number, userId: number, landlordId: number) : void
	    +getRoomTenants(roomId: number, landlordId: number) : CurrentTenant[]
	    +searchRooms(filters: RoomSearchDto) : Room[]
    }
    class Utilities {
	    +electricityPricePerKwh : number
	    +waterPrice : number
	    +waterBillingType : string
	    +internetFee : number
	    +garbageFee : number
	    +cleaningFee : number
	    +parkingMotorbikeFee : number
	    +parkingCarFee : number
	    +managementFee : number
	    +managementFeeUnit : string
	    +gardeningFee : number
	    +cookingGasFee : number
    }
    class IncludedInRent {
	    +electricity : boolean
	    +water : boolean
	    +internet : boolean
	    +garbage : boolean
	    +cleaning : boolean
	    +parkingMotorbike : boolean
	    +parkingCar : boolean
	    +managementFee : boolean
    }
    class CurrentTenant {
	    +userId : number
	    +fullName : string
	    +dateOfBirth : Date
	    +gender : string
	    +occupation : string
	    +moveInDate : Date
	    +lifestyle : string
	    +cleanliness : string
    }
    class ChungCuInfo {
	    +buildingName : string
	    +blockOrTower : string
	    +floorNumber : number
	    +unitCode : string
	    +propertyType : string
	    +bedrooms : number
	    +bathrooms : number
	    +direction : string
	    +legalStatus : string
    }
    class NhaNguyenCanInfo {
	    +khuLo : string
	    +unitCode : string
	    +propertyType : string
	    +bedrooms : number
	    +bathrooms : number
	    +direction : string
	    +totalFloors : number
	    +legalStatus : string
	    +furniture : string
	    +features : string[]
	    +landArea : number
	    +usableArea : number
	    +width : number
	    +length : number
    }
    class Post {
	    +postId : number
	    +userId : number
	    +postType : string
	    +category : string
	    +title : string
	    +description : string
	    +images : string[]
	    +videos : string[]
	    +roomId : number
	    +buildingId : number
	    +landlordId : number
	    +isManaged : boolean
	    +source : string
	    +roomInfo : RoomInfo
	    +personalInfo : PersonalInfo
	    +requirements : Requirements
	    +phone : string
	    +email : string
	    +status : string
	    +createdAt : Date
	    +updatedAt : Date
	    +createPost(userId: number, dto: CreatePostDto) : Post
	    +getPosts(filters: SearchPostsDto) : Post[]
	    +searchPosts(filters: SearchPostsDto) : Post[]
	    +getPostById(postId: number) : Post
	    +getPostWithRoomInfo(postId: number) : Post
	    +getUserRooms(userId: number, postType?: string) : Post[]
	    +getPostsByUser(userId: number) : Post[]
	    +updatePost(postId: number, dto: UpdatePostDto) : Post
	    +deletePost(postId: number) : void
	    +updatePostStatus(postId: number, status: string) : Post
	    +getPostsByLandlord(landlordId: number) : Post[]
	    +getPostsByRoom(roomId: number) : Post[]
    }
    class RoomInfo {
	    +address : Address
	    +basicInfo : BasicInfo
	    +chungCuInfo : ChungCuInfo
	    +nhaNguyenCanInfo : NhaNguyenCanInfo
	    +utilities : Utilities
    }
    class BasicInfo {
	    +area : number
	    +price : number
	    +deposit : number
	    +furniture : string
	    +bedrooms : number
	    +bathrooms : number
	    +direction : string
	    +legalStatus : string
    }
    class PersonalInfo {
	    +fullName : string
	    +dateOfBirth : Date
	    +gender : string
	    +occupation : string
	    +hobbies : string[]
	    +habits : string[]
	    +lifestyle : string
	    +cleanliness : string
    }
    class Requirements {
	    +ageRange : AgeRange
	    +gender : string
	    +traits : string[]
	    +priceRange : MoneyRange
    }
    class RentalContract {
	    +contractId : number
	    +roomId : number
	    +landlordId : number
	    +contractType : string
	    +status : string
	    +startDate : Date
	    +endDate : Date
	    +monthlyRent : number
	    +deposit : number
	    +contractFile : string
	    +tenants : Tenant[]
	    +roomInfo : RoomInfo
	    +createdAt : Date
	    +updatedAt : Date
	    +createContract(dto: CreateContractDto) : RentalContract
	    +getContractsByLandlord(landlordId: number) : RentalContract[]
	    +getContractById(contractId: number) : RentalContract
	    +updateContract(contractId: number, data: any) : RentalContract
	    +addTenantToContract(contractId: number, tenant: any) : RentalContract
	    +removeTenantFromContract(contractId: number, tenantId: number) : RentalContract
	    +getUserContract(userId: number, contractId: number) : RentalContract
    }
    class RoomSharingRequest {
	    +requestId : number
	    +tenantId : number
	    +landlordId : number
	    +roomId : number
	    +postId : number
	    +status : string
	    +message : string
	    +requestType : string
	    +posterId : number
	    +requestedMoveInDate : Date
	    +requestedDuration : number
	    +landlordResponse : string
	    +respondedAt : Date
	    +contractId : number
	    +createdAt : Date
	    +updatedAt : Date
    }
    class RoomSharingContract {
	    +contractId : number
	    +roomId : number
	    +landlordId : number
	    +contractType : string
	    +status : string
	    +startDate : Date
	    +endDate : Date
	    +monthlyRent : number
	    +deposit : number
	    +contractFile : string
	    +tenants : Tenant[]
	    +roomInfo : RoomInfo
	    +createdAt : Date
	    +updatedAt : Date
	    +createContract(dto: CreateContractDto) : RoomSharingContract
	    +updateContract(data: any) : RoomSharingContract
	    +addTenant(tenant: any) : RoomSharingContract
	    +removeTenant(tenantId: number) : RoomSharingContract
	    +generatePDF() : string
	    +isActive() : boolean
	    +getRemainingDays() : number
	    +approveByUser(userId: number) : RoomSharingContract
	    +rejectByUser(userId: number) : RoomSharingContract
    }
    class Tenant {
	    +tenantId : number
	    +moveInDate : Date
	    +monthlyRent : number
	    +deposit : number
	    +status : string
	    +leftDate : Date
    }
    class RentalRequest {
	    +requestId : number
	    +tenantId : number
	    +landlordId : number
	    +roomId : number
	    +postId : number
	    +status : string
	    +message : string
	    +requestType : string
	    +posterId : number
	    +requestedMoveInDate : Date
	    +requestedDuration : number
	    +landlordResponse : string
	    +respondedAt : Date
	    +contractId : number
	    +createdAt : Date
	    +updatedAt : Date
    }
    class Invoice {
	    +invoiceId : number
	    +tenantId : number
	    +landlordId : number
	    +roomId : number
	    +contractId : number
	    +invoiceType : string
	    +amount : number
	    +dueDate : Date
	    +paidDate : Date
	    +status : string
	    +paymentMethod : string
	    +description : string
	    +attachments : string[]
	    +items : object[]
	    +createdAt : Date
	    +updatedAt : Date
	    +createInvoice(dto: CreateInvoiceDto) : Invoice
	    +updateStatus(status: string, paymentMethod?: string) : Invoice
	    +markAsPaid(paymentMethod: string) : Invoice
	    +isOverdue() : boolean
	    +getDaysUntilDue() : number
	    +generateQRCode() : ZaloPayQRData
    }
    class PaymentOrder {
	    +orderId : string
	    +invoiceId : number
	    +tenantId : number
	    +landlordId : number
	    +amount : number
	    +orderType : string
	    +status : string
	    +qrCodeUrl : string
	    +qrCodeData : string
	    +paymentMethod : string
	    +paidAt : Date
	    +expiryAt : Date
	    +isQrGenerated : boolean
	    +zalopayOrderId : string
	    +zalopayTransactionId : string
	    +zalopayPaymentUrl : string
	    +zalopayStatus : string
	    +createdAt : Date
	    +updatedAt : Date
	    +generateQRCode() : ZaloPayQRData
	    +confirmPayment(paymentMethod: string) : PaymentStatus
	    +cancelOrder() : PaymentStatus
	    +isExpired() : boolean
	    +regenerateQRCode() : ZaloPayQRData
	    +checkPaymentStatus() : PaymentStatus
    }
    class PaymentAccount {
	    +paymentAccountId : number
	    +userId : number
	    +provider : string
	    +type : string
	    +externalAccountId : string
	    +accountToken : string
	    +accountMask : string
	    +bankCode : string
	    +status : string
	    +capabilities : string[]
	    +isDefault : boolean
	    +consentAt : Date
	    +consentVersion : string
	    +linkedAt : Date
	    +revokedAt : Date
	    +updatedAt : Date
    }
    class ZaloPayQRData {
	    +orderId : string
	    +qrCodeUrl : string
	    +qrCodeData : string
	    +expiryAt : Date
	    +amount : number
	    +isZaloPayQR : boolean
	    +zalopayOrderId : string
    }
    class PaymentStatus {
	    +orderId : string
	    +status : string
	    +paidAt : Date
	    +paymentMethod : string
	    +isExpired : boolean
	    +message : string
    }
    class ContractUpdate {
	    +contractId : number
	    +updateType : string
	    +updateData : object
	    +updatedBy : number
	    +reason : string
	    +createdAt : Date
    }
    class Verification {
	    +verificationId : number
	    +userId : number
	    +status : string
	    +submittedAt : Date
	    +reviewedAt : Date
	    +reviewedBy : number
	    +idNumber : string
	    +fullName : string
	    +dateOfBirth : Date
	    +gender : string
	    +issueDate : Date
	    +issuePlace : string
	    +adminNote : string
	    +createdAt : Date
	    +updatedAt : Date
	    +create(userId: number, dto: CreateVerificationDto) : Verification
	    +findAll(status?: string, page?: number, limit?: number) : VerificationPage
	    +findByUserId(userId: number) : Verification[]
	    +updateStatus(id: number, adminId: number, dto: UpdateVerificationDto) : Verification
    }
    class FaceMatchResult {
	    +match : boolean
	    +similarity : number
	    +confidence : string
    }
    class Favourite {
	    +favouriteId : number
	    +userId : number
	    +postType : string
	    +postId : number
	    +createdAt : Date
	    +addToFavourites(userId: number, postId: number, postType: string) : Favourite
	    +removeFromFavourites(userId: number, postId: number, postType: string) : void
	    +isFavourited(userId: number, postId: number) : boolean
	    +getUserFavourites(userId: number) : Favourite[]
    }
    class EmailVerification {
	    +verificationId : number
	    +email : string
	    +otp : string
	    +expiresAt : Date
	    +isUsed : boolean
	    +createdAt : Date
    }


    UserProfile *-- MoneyRange : budgetRange
    UserProfile *-- MoneyRange : priceRange
    UserProfile *-- TimeWindow : availableTime
    Requirements *-- AgeRange : ageRange
    Requirements *-- MoneyRange : priceRange
    User "1" -- "1" UserProfile : has profile
    User "1" o-- "*" PaymentAccount : has accounts
    User "1" --> "*" Post : creates
    User "1" o-- "*" Building : owns
    User "1" o-- "*" Room : manages
    User "1" --> "*" Verification : submits
    User "1" --> "*" EmailVerification
    User "1" --> "*" Favourite : creates
    Building "1" o-- "*" Room : contains
    Room *-- Address
    Room *-- Utilities
    Utilities *-- IncludedInRent
    Room o-- "*" CurrentTenant
    Room *-- ChungCuInfo
    Room *-- NhaNguyenCanInfo
    Post *-- RoomInfo
    Post *-- PersonalInfo
    Post *-- Requirements
    RoomInfo *-- Address
    RoomInfo *-- BasicInfo
    RoomInfo *-- ChungCuInfo
    RoomInfo *-- NhaNguyenCanInfo
    RoomInfo *-- Utilities
    Post "*" --> "1" Room : references
    Post "1" --> "*" RentalRequest : generates
    Post "1" --> "*" RoomSharingRequest : generates
    RentalRequest "1" --> "1" RentalContract : creates
    RoomSharingRequest "1" --> "1" RoomSharingContract : creates
    Room "1" --> "*" RentalContract : has contracts
    Room "1" --> "*" RoomSharingContract : has sharing contracts
    RentalContract *-- RoomInfo
    RoomSharingContract *-- RoomInfo
    RentalContract o-- "*" Tenant : includes
    RoomSharingContract o-- "*" Tenant : includes
    RentalContract --> "*" ContractUpdate : updates
    RoomSharingContract --> "*" ContractUpdate : updates
    RentalContract --> "*" Invoice : generates
    RoomSharingContract --> "*" Invoice : generates
    Invoice "*" --> "1" User : tenant
    Invoice "*" --> "1" User : landlord
    Invoice "1" o-- "*" PaymentOrder : paid via
    PaymentOrder "*" --> "1" Invoice : pays
    PaymentOrder "1" o-- "1" PaymentStatus : has status
    PaymentOrder "1" o-- "*" ZaloPayQRData : generates
    PaymentOrder "1" --> "1" PaymentAccount : payer
    PaymentOrder "1" --> "1" PaymentAccount : receiver
    Verification "1" o-- "1" FaceMatchResult
    Verification "*" --> "1" Admin : reviewed by
    Favourite "*" --> "1" Post : targets
    Favourite "*" --> "1" User : owner


	style MoneyRange fill:#23a7d6,stroke:#1f2937,font-size:12px
	style AgeRange fill:#23a7d6,stroke:#1f2937,font-size:12px
	style TimeWindow fill:#23a7d6,stroke:#1f2937,font-size:12px
	style User fill:#23a7d6,stroke:#1f2937,font-size:12px
	style UserProfile fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Admin fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Address fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Building fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Room fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Utilities fill:#23a7d6,stroke:#1f2937,font-size:12px
	style IncludedInRent fill:#23a7d6,stroke:#1f2937,font-size:12px
	style CurrentTenant fill:#23a7d6,stroke:#1f2937,font-size:12px
	style ChungCuInfo fill:#23a7d6,stroke:#1f2937,font-size:12px
	style NhaNguyenCanInfo fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Post fill:#23a7d6,stroke:#1f2937,font-size:12px
	style RoomInfo fill:#23a7d6,stroke:#1f2937,font-size:12px
	style BasicInfo fill:#23a7d6,stroke:#1f2937,font-size:12px
	style PersonalInfo fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Requirements fill:#23a7d6,stroke:#1f2937,font-size:12px
	style RentalContract fill:#23a7d6,stroke:#1f2937,font-size:12px
	style RoomSharingRequest fill:#23a7d6,stroke:#1f2937,font-size:12px
	style RoomSharingContract fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Tenant fill:#23a7d6,stroke:#1f2937,font-size:12px
	style RentalRequest fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Invoice fill:#23a7d6,stroke:#1f2937,font-size:12px
	style PaymentOrder fill:#23a7d6,stroke:#1f2937,font-size:12px
	style PaymentAccount fill:#23a7d6,stroke:#1f2937,font-size:12px
	style ZaloPayQRData fill:#23a7d6,stroke:#1f2937,font-size:12px
	style PaymentStatus fill:#23a7d6,stroke:#1f2937,font-size:12px
	style ContractUpdate fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Verification fill:#23a7d6,stroke:#1f2937,font-size:12px
	style FaceMatchResult fill:#23a7d6,stroke:#1f2937,font-size:12px
	style Favourite fill:#23a7d6,stroke:#1f2937,font-size:12px
	style EmailVerification fill:#23a7d6,stroke:#1f2937,font-size:12px

	classDef Aqua :,stroke-width:1px, stroke-dasharray:none, stroke:#46EDC8, fill:#DEFFF8, color:#378E7A
	classDef Class_02 fill:#23a7d6, background-color:#23a7d6
