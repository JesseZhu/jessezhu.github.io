
大家好，在刚开始学习 Swift 时，我像很多开发者一样，知道一个“简单”的区别：**Struct 是值类型（Value Type），Class 是引用类型（Reference Type）**。而 Enum 也是值类型。

但随着项目的深入，我开始不断地问自己：

  * 为什么 Swift 的标准库，像 `String`, `Array`, `Dictionary` 都是用 `Struct` 实现的？
  * 我应该默认使用 `Struct` 吗？什么时候必须用 `Class`？
  * `Enum` 只是用来表示几个固定选项吗？还是它有更强大的能力？

今天，我想和大家深入聊聊这个话题。这不只是一篇概念普及文章，我更希望通过具体的例子和场景，分享我对于这三者**边界**和**取舍**的思考。

## 📥 核心差异：一张图看懂“复印件”与“共享链接”

要理解值类型和引用类型，我们先不用代码，来看一个生活中的比喻。

### 1\. 值类型 (Value Type)：一份“复印件”

`Struct` 和 `Enum` 都是值类型。

想象一下，你有一份文档（原始数据）。当你把这份文档交给同事时，你是**复印了一份全新的文档**给他们。

  * **独立性**：同事在“复印件”上做的任何修改（划线、写字），**完全不会**影响你手里的“原件”。
  * **机制**：数据在传递时，总是被复制。

**代表：** `Struct`, `Enum`, `Tuple`

### 2\. 引用类型 (Reference Type)：一个“共享链接”

`Class` 是引用类型。

想象一下，你把一份文档上传到了“共享云盘”（内存中的某个位置），然后你把“共享链接”发给了你的同事。

  * **共享性**：你和你的同事都通过这个“链接”访问**同一份**云端文档。
  * **机制**：同事通过链接修改了文档，你本地再打开这个链接，看到的是**被修改后**的内容。因为你们指向的是同一个实例。

**代表：** `Class`, `Function`, `Closure`

-----

## 💻 代码实战：眼见为实

光说不练假把式。我们用代码来验证这个行为。

### Struct (值类型) 的“各自为政”

我们定义一个简单的 `Point` 结构体：

```swift
struct Point {
    var x: Int
    var y: Int
}

// 1. 创建一个实例
var originalPoint = Point(x: 10, y: 20)

// 2. 将它赋值给一个新的变量 (这里发生了“复制”)
var copiedPoint = originalPoint

// 3. 修改“复印件”
copiedPoint.x = 100

// 4. 检查“原件”
print("Original Point: \(originalPoint.x)") // 输出：10
print("Copied Point: \(copiedPoint.x)")   // 输出：100
```

**结论：** `copiedPoint` 的修改丝毫没有影响 `originalPoint`。它们是两块完全独立的内存。

### Class (引用类型) 的“一荣俱荣”

现在，我们用 `Class` 定义一个 `User`：

```swift
class User {
    var name: String
    
    init(name: String) {
        self.name = name
    }
}

// 1. 创建一个实例
var userA = User(name: "Alice")

// 2. 将它赋值给一个新的变量 (这里传递的是“引用”或“共享链接”)
var userB = userA

// 3. 通过 userB 修改
userB.name = "Bob"

// 4. 检查 userA
print("User A: \(userA.name)") // 输出：Bob
print("User B: \(userB.name)") // 输出：Bob
```

**结论：** `userA` 和 `userB` 指向堆（Heap）上的同一个对象。修改 `userB.name` 实际上是修改了那个共享对象，所以 `userA.name` 也“被”改变了。

## 🧠 深入内存：栈 (Stack) 与 堆 (Heap)

为了更“专家”一点，我们必须谈谈内存。`Struct` 和 `Class` 的行为差异，根本上源于它们在内存中存储方式的不同。

  * **栈 (Stack)**：一块非常快、管理简单的内存区域。用于存储**值类型**实例（如 `Struct`, `Enum`）和**引用类型的指针**。它就像一摞盘子，后进先出，分配和释放的成本极低。
  * **堆 (Heap)**：一块更大、更灵活但也更“慢”的内存区域。用于存储**引用类型**（`Class`）的实例数据。在堆上分配和释放内存需要更多开销，并且需要**ARC (自动引用计数)** 来管理这片内存何时该被释放。

我们可以用一张图来表示：

```

[
  图解：
  左侧是 "Stack (栈)"：
    - 存放着 originalPoint {x: 10, y: 20}
    - 存放着 copiedPoint {x: 100, y: 20}
    - 存放着 userA (一个指针) --> 指向右侧
    - 存放着 userB (一个指针) --> 指向右侧

  右侧是 "Heap (堆)"：
    - 存放着一个 User 对象 {name: "Bob"}
    - (userA 和 userB 的箭头都指向这个对象)
]
```

**关键点：**

1.  值类型（`Struct`）实例直接存在栈上。复制时，就是在栈上创建了一个全新的副本。
2.  引用类型（`Class`）实例存在堆上。栈上只存储了指向它的“地址”（指针）。复制时，只是复制了这个“地址”，而不是堆上的实际数据。

## 👑 Enum 的特殊角色：不只是选项

我们经常低估 `Enum`。它也是一个**值类型**，但它的核心价值在于**定义一组有限的、相关的值**。

在 Swift 中，`Enum` 极其强大，尤其是当它与**关联值 (Associated Values)** 结合时。

思考一个场景：加载网络数据。我们有三种状态：加载中、加载成功、加载失败。

**不好的做法 (用 Struct)：**

```swift
struct LoadState {
    var isLoading: Bool
    var data: Data?
    var error: Error?
}
// 这种方式存在“无效状态”，比如 isLoading=true 的同时 error 也有值？
```

**极好的做法 (用 Enum)：**

```swift
enum LoadState {
    case loading
    case success(data: Data)
    case failure(error: Error)
}

// 你的视图（View）可以安全地处理每一种“确定”的状态
func updateUI(for state: LoadState) {
    switch state {
    case .loading:
        print("显示加载动画...")
    case .success(let data):
        print("刷新UI，数据大小: \(data.count)")
    case .failure(let error):
        print("显示错误提示: \(error.localizedDescription)")
    }
}
```

`Enum` 在这里完美地封装了“状态”，让我们的代码更安全、更清晰。**在表示“状态”或“种类”时，优先考虑 `Enum` 而不是 `Struct` 或 `Class`。**

-----

## ⚖️ 终极对决：我的决策清单

好了，理论都懂了，我们到底该怎么选？

这是我在开发中总结的一份决策清单，希望能给你启发。

> 苹果官方的建议是：“**优先使用 Struct**” (Choose structures by default)。

### ✅ 什么时候我坚决使用 Struct (或 Enum)？

1.  **数据模型 (Model)：** 当我定义一个数据模型（比如 `Post`, `Product`, `Setting`），它没有复杂的继承关系，只是用来封装数据。
2.  **追求“可预测性”：** 当我不希望数据在传递过程中被意外修改时。值类型让数据流非常清晰——数据从哪来，到哪去，都是“副本”，互不干扰。
3.  **追求“并发安全”：** 在多线程环境下，值类型天生更安全。因为线程间传递的是副本，你不需要担心“数据竞态”（Data Race）的问题。（注：如果 Struct 内部包含一个 Class 实例，那它就不是完全线程安全的）。
4.  **小而简单的数据块：** 像 `CGPoint`, `CGSize`, `URLQueryItem` 这样的。

### 🚨 什么时候我必须使用 Class？

尽管苹果推崇 `Struct`，但在以下场景，`Class` 仍然是不可替代的。

1.  **需要“身份” (Identity)：** 这是最重要的一点。当你需要判断两个变量是否**指向同一个实例**时。

      * **例子：** 一个 `UserSession` 管理器。在 App 的任何地方获取的 `UserSession.shared` 都必须是**同一个对象**，这样登录状态才能同步。如果你用 `Struct`，每次获取都是个新副本，状态就乱了。
      * **判断：** 使用 `===` (恒等运算符) 来检查两个引用是否指向同一个对象。

2.  **需要“共享状态” (Shared State)：** 当你*有意*让多个“持有者”共享和修改同一个数据实例时。

      * **例子：** 一个 `NetworkService` 实例，它可能持有一些共享的缓存或配置。App 内的多个部分都应该使用这个共享的实例。

3.  **需要“继承” (Inheritance)：** 当你需要面向对象的继承特性时。比如，你需要子类化一个 `UIViewController` 或 `UIView`。

      * **注意：** 在 Swift 中，我们更推崇使用**协议 (Protocol)** 来实现多态和代码复用（面向协议编程），但继承在特定场景（如 UIKit）下仍然是必须的。

4.  **需要与 Objective-C 交互：** 很多老的 Apple API (如 `NSObject` 及其子类) 都是基于 `Class` 的。

## 💡 一个微妙的性能点：Copy-on-Write (COW)

有人可能会担心：“你刚说 `Array` 和 `Dictionary` 都是 `Struct`，那岂不是每次传递它们都要复制整个数组？性能不会崩吗？”

问得好。Swift 在这里做了一个非常聪明的优化，叫做 **写时复制 (Copy-on-Write, COW)**。

  * 当你“复制”一个 `Array` (值类型) 时，Swift 并不会立刻复制所有数据。
  * 它只是让新旧两个变量指向**同一块内存**（类似引用）。
  * **只有当你尝试修改**其中一个数组时（比如 `append` 一个新元素），Swift 才会真正执行复制操作，将数据分开。

这让我们既享有了 `Struct` 的值语义（数据隔离、安全性），又避免了不必要的复制开销。

## 总结

在 Swift 开发中，`Struct`、`Class` 和 `Enum` 不是竞争关系，而是互补的工具。

我希望你读完这篇文章后，能形成自己的决策思路：

1.  **默认使用 `Struct`**：它更安全、更简单，性能也因为栈分配和 COW 而非常出色。
2.  **用 `Enum` 来建模“状态”和“种类”**：利用关联值，它可以让你的状态机（State Machine）变得无比清晰。
3.  **仅在必要时使用 `Class`**：当你需要**共享状态**、**唯一身份**或**继承**时，`Class` 是你的不二之选。

理解它们的边界，是成为一名优秀 Swift 工程师的必经之路。

-----

感谢你的阅读！你对这个话题有什么自己的看法吗？你通常的“默认选择”是什么？欢迎在评论区留言和我交流。