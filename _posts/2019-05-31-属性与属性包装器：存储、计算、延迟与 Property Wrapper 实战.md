---
layout: "post"
title:  "属性与属性包装器：存储、计算、延迟与 Property Wrapper 实战"
date:  2019-05-31 13:15:43
categories: [杂项]
tags: [Swift]
---

在我们的 Swift 开发之旅中，“属性”（Property）是我们打交道的第一个“老朋友”。它们构成了 `Struct` 和 `Class` 的“状态”。最开始，我以为属性就是用来“存东西”的。但很快我发现，它们有的能“算东西”（计算属性），有的“很懒”（延迟属性），有的甚至还带着“观察哨”（`willSet`/`didSet`）。

而当我遇到 **Property Wrapper** 时，我才真正意识到，Swift 在“属性”这个基础概念上构建了一个多么优雅和强大的抽象层。

今天，我们就来一次“属性”的全面进阶，看看如何用好它们，并最终利用 Property Wrapper 来重构我们的代码，使其变得更简洁、更可复用。

## 1\. 存储属性 (Stored Properties)：状态的基石

这是最简单的一种。它就是实例内存中的一块“地”，用来**存储一个具体的值**。

```swift
struct User {
    // 这就是两个存储属性
    var username: String
    var age: Int
}
```

但存储属性有两个强大的“观察哨”：`willSet` 和 `didSet`。

`didSet` 是我用得最多的，它允许我们在属性**被设置之后**执行一段逻辑，非常适合用来响应数据变化。

```swift
class ScoreViewModel {
    var score: Int = 0 {
        // 'didSet' 就像一个“属性观察哨”
        didSet {
            // 'oldValue' 是一个自动可用的变量，代表设置前的值
            print("分数变化了！从 \(oldValue) 变成了 \(score)")
            if score < 0 {
                score = 0 // 甚至可以在这里“修正”值
            }
            updateScoreLabel() // 非常适合在这里触发 UI 更新
        }
    }
    
    func updateScoreLabel() {
        // ... 更新 UI 的逻辑 ...
    }
}

let vm = ScoreViewModel()
vm.score = 10  // 输出: 分数变化了！从 0 变成了 10
vm.score = -5  // 输出: 分数变化了！从 10 变成了 -5
               // 接着 'didSet' 内部又把它修正为 0
print(vm.score) // 输出: 0
```

`didSet` 非常好用，但当这种“修正”逻辑（比如 `score < 0`）变得复杂且需要在多处复用时，它的短板就出现了。我们后面会用 Property Wrapper 完美解决它。

## 2\. 计算属性 (Computed Properties)：伪装的函数

计算属性**不存储任何值**。它看起来像个属性，但实际上是“伪装”起来的函数。

它必须提供一个 `get` 方法来“计算”出一个值。它也可以选择性地提供一个 `set` 方法，来“解析”一个新值并用它来修改**其他**存储属性。

```

[
  图解：
  左侧 "存储属性" (Stored)：
    - 一个 "盒子"，里面装着 "值" (Value)
  右侧 "计算属性" (Computed)：
    - 一个 "齿轮" (Get) 和 "漏斗" (Set)
    - Get：从其他属性（比如 firstName, lastName）计算出值
    - Set：把新值（比如 fullName）拆分，存回其他属性
]
```

最经典的例子就是 `fullName`：

```swift
struct User {
    var firstName: String
    var lastName: String
    
    // 这是一个计算属性
    var fullName: String {
        get {
            // Get：当读取 fullName 时，执行这里的代码
            return "\(firstName) \(lastName)"
        }
        
        set {
            // Set：当设置 fullName = "Alice Smith" 时，执行这里的代码
            // 'newValue' 是自动可用的新值
            let components = newValue.split(separator: " ")
            if components.count >= 2 {
                firstName = String(components[0])
                lastName = String(components[1])
            }
        }
    }
}

var user = User(firstName: "Alice", lastName: "Johnson")

// 1. 调用 Get
print(user.fullName) // 输出: Alice Johnson

// 2. 调用 Set
user.fullName = "Bob Smith"

// 3. 检查底层的存储属性
print(user.firstName) // 输出: Bob
print(user.lastName)  // 输出: Smith
```

**何时使用？** 当一个属性的值需要**完全依赖**其他属性动态计算得出时。

## 3\. 延迟存储属性 (Lazy Stored Properties)：性能“拖延症”

`lazy` 是我最喜欢的性能优化关键字之一。它也是一个存储属性，但它有一个特点：

> **`lazy` 属性的初始值，直到它“第一次”被访问时，才会被计算。**

它就像个“懒汉”，非到万不得已（你来访问我了）才去干活（初始化）。

\`\`
`[图解：时间轴。T=0: 实例创建 (lazy 属性未初始化)。 T=5: 访问其他属性。 T=10: 第一次访问 lazy 属性 -> [触发昂贵的计算] -> 属性被初始化并返回值。 T=15: 第二次访问 lazy 属性 -> [直接返回值]]`

**实战场景：**
想象一下，你有一个 `UserProfileViewController`，它需要显示一个“好友列表”，而加载这个好友列表是个“昂贵”的操作（比如要创建另一个复杂的 `FriendsListComponent` 对象）。

```swift
class FriendsListComponent {
    init() {
        // 模拟昂贵的初始化，比如加载数据
        print("FriendsListComponent 正在初始化... (昂贵操作)")
        Thread.sleep(forTimeInterval: 1) // 模拟耗时
    }
}

class UserProfileViewController {
    // 标记为 lazy！
    lazy var friendsList: FriendsListComponent = FriendsListComponent()
    
    var username: String = "Alice"
    
    init() {
        print("UserProfileViewController 初始化完毕")
    }
    
    func viewDidAppear() {
        print("视图出现了")
        // ... 显示用户名等 ...
    }
    
    func friendsButtonTapped() {
        print("用户点击了'好友'按钮")
        // 这是 friendsList 第一次被访问
        // "FriendsListComponent 正在初始化..." 将在此时被打印
        let _ = self.friendsList 
        // ... 弹出好友列表 ...
    }
}

let profile = UserProfileViewController() // 输出: UserProfileViewController 初始化完毕
profile.viewDidAppear()                   // 输出: 视图出现了

// 注意：到目前为止，昂贵的 FriendsListComponent 根本没有被创建

print("--- 等待用户点击 ---")

// 模拟用户点击
profile.friendsButtonTapped()
// 输出: 用户点击了'好友'按钮
// 输出: FriendsListComponent 正在初始化... (昂贵操作)
```

**关键点：**

1.  `lazy` 必须是 `var`（因为它的值在初始化后会变）
2.  非常适合用于初始化成本高、且不一定会被用到的对象。

## 4\. 属性包装器 (Property Wrapper)：逻辑的终极抽象

好了，欢迎来到“重头戏”。

你是否也曾写过这样的“重复”代码？

  * **场景A (数据校验)：** `didSet` 里检查 `score`，确保它不小于 0。
  * **场景B (数据处理)：** `didSet` 里给 `username` 自动去除首尾空格。
  * **场景C (持久化)：** `didSet` 里把 `isMuted` 这个设置项，存入 `UserDefaults`。

这些逻辑（校验、处理、持久化）和 `ScoreViewModel` 或 `Settings` 这样的**业务模型**是“**非正交**”的。它们是“横切关注点”，应该被抽离。

`Property Wrapper` 就是来做这个的！它允许我们将一个属性的 `get` 和 `set` 逻辑，**包装**到一个单独的 `struct` 或 `class` 中，然后以一种声明式（`@WrapperName`）的方式**复用**它。

你每天都在用的 `@State`, `@Binding`, `@Published` 都是 Property Wrapper。

### 实战一：打造 `@Trimmed` - 自动去空格

我们先来解决“场景B”。我们希望任何一个 `String` 属性，在被赋值时，都能自动去除首尾空格。

**1. 定义包装器**
`Property Wrapper` 本质上是一个 `struct` (或 `class`)，它必须有一个名为 `wrappedValue` 的属性。

```swift
@propertyWrapper // 1. 标记为属性包装器
struct Trimmed {
    private var value: String = "" // 2. 内部的实际存储
    
    // 3. 'wrappedValue' 是核心！
    // 编译器会把对 'email' 的读写，自动转为对 'wrappedValue' 的读写
    var wrappedValue: String {
        get {
            return value
        }
        set {
            // 4. 在这里，我们注入了“去空格”的逻辑！
            value = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
        }
    }
    
    // 5. 我们需要一个 init 来接收初始值
    init(wrappedValue initialValue: String) {
        // 'set' 会被自动调用，所以初始化时就会去空格
        self.wrappedValue = initialValue
    }
}
```

**2. 使用包装器**
现在，在我们的模型里使用它：

```swift
struct SignupForm {
    @Trimmed var email: String
    @Trimmed var username: String
}

var form = SignupForm(email: "  alice@example.com ", username: " bob  ")

// Get (调用包装器的 get)
print(form.email)    // 输出: "alice@example.com" (没有空格!)
print(form.username) // 输出: "bob"

// Set (调用包装器的 set)
form.email = "  new.email@server.com  "
print(form.email)    // 输出: "new.email@server.com" (还是没有空格!)
```

看！`SignupForm` 变得多么干净！它只关心它有什么属性 (`email`, `username`)，而**不关心**这些属性是如何被清理和存储的。

### 实战二：打造 `@UserDefault` - 优雅的持久化

这是最经典的 Property Wrapper 例子。我们来解决“场景C”。

```swift
@propertyWrapper
struct UserDefault<Value> {
    let key: String
    let defaultValue: Value
    let storage: UserDefaults = .standard

    var wrappedValue: Value {
        get {
            // 从 UserDefaults 读取值
            return storage.value(forKey: key) as? Value ?? defaultValue
        }
        set {
            // 写入 UserDefaults
            storage.setValue(newValue, forKey: key)
        }
    }
    
    // 自定义 init，用来接收 key 和 defaultValue
    init(wrappedValue: Value, key: String) {
        self.defaultValue = wrappedValue
        self.key = key
    }
}

// --- 如何使用 ---

struct AppSettings {
    // 声明式地将属性“绑定”到 UserDefaults 的 key 上
    @UserDefault(key: "app.settings.isMuted")
    var isMuted: Bool = false // 'false' 成了默认值
    
    @UserDefault(key: "app.settings.volume")
    var volume: Double = 0.8
}

var settings = AppSettings()

// 1. 读取 (自动从 UserDefaults 或使用默认值)
print(settings.volume) // 输出 0.8 (如果没存过)

// 2. 写入 (自动存入 UserDefaults)
settings.volume = 0.5

// 3. 验证
// (你可以重启 App，再创建一个 AppSettings 实例，
// settings.volume 读出来的会是 0.5)
```

\`\`
`[图解：AppSettings (模型) -> @UserDefault (包装器) -> UserDefaults (实际数据源)]`

通过这个包装器，我们的 `AppSettings` 成了“活”的配置表。你对 `settings.volume` 的任何修改，都会被 `@UserDefault` 包装器“拦截”，并自动存入 `UserDefaults`。

## 总结

我们从最简单的**存储属性**出发，看到了它通过 `didSet` 观察状态变化的能力。接着，我们学习了**计算属性**如何“伪装”成属性，动态地提供衍生数据。然后，我们用 **`lazy`** 解决了昂贵资源的性能问题。

最后，我们发现，无论是 `didSet` 的校验逻辑、计算属性的转换逻辑，还是 `lazy` 的加载逻辑，当它们需要被复用时，**Property Wrapper** 都是那个最优雅的答案。

它将“属性该做什么”的逻辑，从业务模型中彻底剥离，实现了真正的“高内聚、低耦合”。

-----

感谢你的阅读！你最喜欢 Swift 的哪种属性？你是否也创造过自己的 Property Wrapper 来简化代码？欢迎在评论区分享你的实战经验！