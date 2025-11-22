---
layout: "post"
title:  "函数与闭包进阶：逃逸、@autoclosoure与捕获列表的语意"
date:  2019-05-17 13:15:43
categories: [杂项]
tags: [Swift]
---

在 Swift 的世界里，函数和闭包是一等公民。我们可以像传递一个 `Int` 或 `String` 一样，把它们作为参数传递，或者作为返回值返回。
这种灵活性是 Swift 表现力的核心。但它也引入了三个非常重要、且经常被混淆的概念：**`@escaping` (逃逸)**、**`[weak self]` (捕获列表)** 和 **`@autoclosure` (自动闭包)**。

刚开始，我只是“按需”使用它们——编译器报错，我就加上 `[weak self]`；编译器提示，我就加上 `@escaping`。但这种“被动”的学习方式，让我对内存泄漏和性能问题始终心里没底。

今天，我想和大家分享我是如何从“被动应付”转变为“主动掌控”的，彻底搞懂这三者在做什么，以及为什么它们对构建健壮的 App 如此重要。

## 1\. `@escaping`：逃出“牢笼”的闭包

要理解“逃逸”，我们首先要明白什么是“**非逃逸**” (non-escaping)。

**默认情况下，在 Swift 中，传递给函数的闭包是“非逃逸”的。**

这意味着什么？

> **非逃逸 (Non-escaping)：** 编译器“知道”这个闭包的生命周期。它确信，这个闭包**只会在函数体执行期间被调用**，在函数返回（return）之前，这个闭包就已经“寿终正寝”了。

比如 `Array` 的 `forEach`：

```swift
func printNumbers(numbers: [Int]) {
    print("函数开始")
    numbers.forEach { number in
        // 这个闭包是在 forEach 函数内部“立即”执行的
        print(number)
    }
    print("函数结束") // 闭包一定在“函数结束”之前就执行完了
}
```

编译器可以进行很多优化，因为它不需要担心这个闭包的“身后事”。

### 什么是“逃逸” (Escaping)？

> **逃逸 (@escaping)：** 当一个闭包的调用时机，**晚于**它所在的函数返回时，我们就说这个闭包“逃逸”了。

它“逃出”了函数的生命周期。

最常见的两个场景：

1.  **异步执行：** 你把闭包（比如网络请求的 `completion`）派发到了另一个线程，函数本身立即返回了。
2.  **存储：** 你把闭包存到了一个属性里，以便“将来”某个时候再调用。

我们来看一个典型的异步例子：

```swift
// 1. 定义一个“逃逸”闭包作为参数
func fetchData(completion: @escaping (Result<String, Error>) -> Void) {
    print("fetchData 函数开始执行")
    
    // 2. 模拟一个异步网络请求
    DispatchQueue.global().asyncAfter(deadline: .now() + 2.0) {
        // 3. 闭包在这里被调用，是在 2 秒后！
        // 此时 fetchData 函数早就执行完毕并返回了
        print("网络请求回来了")
        completion(.success("这是数据"))
    }
    
    print("fetchData 函数结束返回")
}

// 调用
fetchData { result in
    print("闭包被执行了: \(result)")
}

/*
输出顺序：
fetchData 函数开始执行
fetchData 函数结束返回
(等待 2 秒)
网络请求回来了
闭包被执行了: success("这是数据")
*/
```

如果没有 `@escaping` 标记，编译器会报错。

### 为什么编译器需要我明确写 `@escaping`？

`@escaping` 不仅仅是一个“语法要求”，它是一个\*\*“警告”\*\*。

它在提醒你：“嘿，注意！这个闭包的生命周期很长，它会持有它捕获的任何变量（比如 `self`）。你**必须**考虑内存管理问题！”

这就是为什么当你在一个 `@escaping` 闭包里访问 `self` 的属性时，编译器会**强制**你写 `self.`。

```swift
class MyViewController: UIViewController {
    var dataLabel: UILabel!
    
    func loadData() {
        fetchData { [weak self] result in
            // 在逃逸闭包里，必须显式写 self
            // 编译器在逼你思考：“self 在这里会不会产生循环引用？”
            self?.dataLabel.text = "数据" 
        }
    }
    // ... fetchData 定义同上
}
```

这完美地引出了我们的下一个主题：捕获列表。

## 2\. 捕获列表 (Capture List)：决战“循环引用”

`@escaping` 告诉我们“有内存风险”，而**捕获列表**（如 `[weak self]`）就是我们“解决风险”的工具。

### 什么是“循环引用” (Reference Cycle)？

我们用一张图来解释。假设我们有一个 `DataLoader`，它持有一个闭包（比如 `onDataLoaded`），用来在数据加载后通知外界。

```swift
class DataLoader {
    var onDataLoaded: (() -> Void)?
    var data = "SomeData"
    
    func load() {
        // 模拟异步加载
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            // 默认情况下，闭包会“强引用” self
            self.onDataLoaded?()
        }
    }
    
    deinit {
        print("DataLoader deallocated")
    }
}

class MyController {
    var dataLoader = DataLoader()
    
    func setup() {
        // Controller 强引用了 dataLoader
        
        // 闭包又强引用了 Controller (self)
        dataLoader.onDataLoaded = {
            print("数据加载完毕：\(self.dataLoader.data)") // 闭包捕获了 self
        }
    }
    
    deinit {
        print("MyController deallocated")
    }
}

// 在某个地方使用
var controller: MyController? = MyController()
controller?.setup()
controller = nil // 尝试释放
```

当 `controller` 被设为 `nil` 时，你猜 `deinit` 会被调用吗？

**答案是：不会。**

我们制造了一个内存泄漏：

\`\`
`[图解：MyController --(强引用)--> DataLoader 实例]`
\`[图解：DataLoader 实例 --(强引用)--\> 闭包 (onDataLoaded)]\`
\`[图解：闭包 (onDataLoaded) --(强引用)--\> MyController (因为它捕获了 self)]\`

`MyController` 和 `DataLoader` (通过它的闭包) 互相“拥抱”，ARC (自动引用计数) 无法将它们释放。

### 解决方案：`[weak self]` 与 `[unowned self]`

捕获列表就是放在闭包 `{` 前的 `[]`，它用来改变闭包捕获变量的“方式”。

**1. `[weak self]` (弱引用)：最安全的选择**

`weak` 告诉闭包：“请**弱**引用 `self`”。弱引用**不会**增加 `self` 的引用计数。

  * **特点：** `self` 在闭包内部会变成一个**可选值** (`self?`)。
  * **原因：** 因为是弱引用，`self`（比如那个 `MyController`）可能在闭包被调用前就被释放了（变为 `nil`）。

<!-- end list -->

```swift
dataLoader.onDataLoaded = { [weak self] in
    // 闭包不再强引用 self，循环被打破
    
    // 在这里，self 是 MyController? 类型
    // 我们需要安全解包
    guard let self = self else { 
        // self 已经释放，什么也不用做了
        return 
    }
    
    // 'self' 在 guard 内部是一个强引用，可以安全使用
    print("数据加载完毕：\(self.dataLoader.data)")
}
```

这个 `guard let self = self` 的写法非常经典，它被戏称为“**弱-强 舞蹈 (weak-strong dance)**”。它保证了如果 `self` 还存在，那么在闭包执行期间，`self` 会被临时强引用，防止它在闭包执行到一半时被释放。

**2. `[unowned self]` (无主引用)：更危险的选择**

`unowned` 告诉闭包：“我**确信** `self` 的生命周期比这个闭包长。所以你不用强引用它，也不用把它当可选值。”

  * **特点：** `self` 在闭包内部**不是可选值**。
  * **风险：** 如果你的“确信”是错的，`self` 在闭包调用前被释放了，那么当闭包试图访问 `self` 时——**App 将直接闪退！**

<!-- end list -->

```swift
// 只有在你 100% 确定 self 绝不会先于闭包释放时才用
dataLoader.onDataLoaded = { [unowned self] in
    // self 在这里是 MyController 类型，不是可选
    // 如果 self 意外释放了，这里会 crash
    print("数据加载完毕：\(self.dataLoader.data)")
}
```

> **我的原则：** **永远默认使用 `[weak self]`。** 只有当你能通过架构设计**证明** `self` 绝对会比闭包活得长（比如 `self` 是父节点，闭包是子节点，子节点不可能比父节点活得长），并且极其在乎那一点点解包的性能开销时，才考虑 `unowned`。

## 3\. `@autoclosure`：延迟执行的“语法糖”

这是一个相对独立的概念。`@autoclosure` 是一个非常精妙的“语法糖”。

> **@autoclosure：** 它可以把一个**普通的表达式**自动“包装”成一个**闭包**。

什么意思？我们来看 Swift 标准库中的 `assert` 函数：

```swift
// 这是 assert 函数的简化定义
func assert(_ condition: Bool, _ message: @autoclosure () -> String) {
    if !condition {
        // 只有在条件为 false 时，才调用 message() 来获取字符串
        let errorMsg = message() 
        fatalError(errorMsg)
    }
}
```

注意看 `message` 参数。它是一个 `() -> String` 类型的**闭包**，并且被标记了 `@autoclosure`。

**如果没有 `@autoclosure`**，我们调用它时必须写成：

```swift
let x = 1
assert(x > 10, { 
    // 必须手动写一个闭包
    return "X 必须大于 10，但它现在是 \(x)" 
})
```

**有了 `@autoclosure`**，调用就变得超级自然：

```swift
let x = 1
assert(x > 10, "X 必须大于 10，但它现在是 \(x)")
// "X 必须大于..." 这个字符串被自动包装成了一个闭包
// 传递给了 assert 函数
```

### `@autoclosure` 的真正目的：延迟执行

这仅仅是为了少写一对 `{}` 吗？不。

**真正的目的是“延迟执行”，为了性能。**

在 `assert` 的例子里：
`"X 必须大于 10，但它现在是 \(x)"` 这个字符串（可能包含复杂的拼接或计算）**只会在 `condition` 为 `false` 的时候才会被执行**（通过 `message()` 调用）。

如果 `condition` 是 `true`，`message()` 永远不会被调用，那个“昂贵”的字符串拼接操作也就永远不会发生。

`@autoclosure` 让我们既获得了“延迟执行”的性能好处，又保持了函数调用的简洁。

> **注意：** 在你自己的 API 中要谨慎使用 `@autoclosure`。它会降低代码的清晰度，让调用者“误以为”他们传递的是一个值，而实际上是一个“待执行的闭包”。它最适合用在 `assert`、`precondition` 或自定义的“短路”逻辑运算符上。

## 总结

我们今天深入了 Swift 中函数与闭包的三个高级特性：

1.  **`@escaping`**：

      * **语意**：闭包的生命周期将“逃逸”出函数，通常用于异步或存储。
      * **作用**：提醒开发者（并告知编译器）必须考虑**内存管理**问题，比如循环引用。

2.  **捕获列表 (`[weak self]`, `[unowned self]`)**：

      * **语意**：明确指定闭包如何“捕获”外部变量。
      * **作用**：`[weak self]` 是我们打破“强引用循环”（内存泄漏）的最主要、最安全的武器。

3.  **`@autoclosure`**：

      * **语意**：将一个表达式自动包装成一个闭包。
      * **作用**：实现“延迟执行”，在不牺牲 API 简洁性的前提下，获得性能提升。

理解这些关键字背后的“为什么”，而不仅仅是“怎么用”，是我们从“会写 Swift”到“写好 Swift”的关键一步。

-----

感谢你的阅读！你对这几个概念还有什么疑问吗？或者你有什么使用 `[unowned self]` 的“绝佳”场景？欢迎在评论区和我讨论！