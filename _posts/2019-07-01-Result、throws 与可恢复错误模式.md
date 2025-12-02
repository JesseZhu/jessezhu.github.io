---
layout: "post"
title:  "Result、throws 与可恢复错误模式"
date:  2019-07-1 13:15:43
categories: [杂项]
tags: [Swift]
toc: false
comments: false
---


在 Swift 的演进历程中，我们经历了从 Objective-C 时代的 `NSError **` 指针噩梦，到 Swift 2.0 引入 `throws`，再到 Swift 5 引入 `Result` 类型，以及现在 Swift 6 的 **Typed Throws**。

今天，我们要跳出语法的框框，从**工程化**的角度来聊聊：在构建一个复杂的 App 时，如何设计一套既安全、又优雅，甚至具备“自愈能力”的错误处理系统。

----------

你是否也曾在代码里写过 `try?`，心里想着“这里应该不会错吧”，然后假装无事发生？或者在回调地狱里，面对 `(Data?, URLResponse?, Error?)` 这种“三元组”感到头大？

错误处理不应该是开发过程中的“补丁”，它应该是**架构设计的一等公民**。

一个优秀的错误处理系统，不仅能告诉开发者“哪里坏了”，还能告诉用户“怎么解决”，甚至能自动尝试“自我修复”。今天，我们就来深度解析 Swift 错误处理的三重境界。

## 1\. `throws` 与 `do-catch`：控制流的艺术

Swift 最原生的错误处理方式是 `throws`。它的核心理念是：**错误处理就是控制流的一部分**。

当你看到 `throws` 时，编译器在告诉你：“这个函数有两个出口：一个是正常的返回值，一个是抛出的异常。”

### 最佳场景：同步逻辑与线性流程

在处理文件操作、JSON 解析或简单的同步逻辑时，`throws` 是最干净的选择。它让成功的路径看起来非常线性，没有任何缩进。

```swift
struct Config: Decodable {
    let apiEndpoint: String
}

enum ConfigError: Error {
    case fileNotFound
    case decodingFailed
}

// ✅ 使用 throws：成功的路径一目了然
func loadConfig(named filename: String) throws -> Config {
    guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
        throw ConfigError.fileNotFound
    }
    
    // 这里的 try 会自动向上传递错误
    let data = try Data(contentsOf: url)
    return try JSONDecoder().decode(Config.self, from: data)
}

// 调用处
do {
    let config = try loadConfig(named: "Production")
    print("API: \(config.apiEndpoint)")
} catch {
    // 统一处理错误
    print("配置加载失败: \(error)")
}
```

**工程化思考：**
`throws` 的最大优势在于它**强制**调用者处理错误（或者继续抛出）。但在 Swift 6 之前，它有一个弱点：它是“无类型”的。`catch` 到的永远是 `any Error`，你需要手动 `as?` 转型。

*注：Swift 6 引入了 Typed Throws (`throws(ConfigError)`)，完美解决了这个问题。*

## 2\. `Result` 类型：错误即数据

如果说 `throws` 是关于\*\*动作（Action）**的，那么 `Result` 就是关于**数据（Data）\*\*的。

`Result<Success, Failure>` 是一个枚举，它把“成功的值”和“失败的错”封装到了一个变量里。

### 最佳场景：异步边界与状态存储

在异步回调（Completion Handler）或者需要将“操作结果”存起来稍后处理时，`Result` 是不二之选。

```swift
// 模拟一个异步网络请求
func fetchUserProfile(completion: @escaping (Result<User, NetworkError>) -> Void) {
    // ... 网络请求逻辑 ...
    if success {
        completion(.success(user))
    } else {
        completion(.failure(.timeout))
    }
}

// ✅ Result 的强大之处：链式操作 (Functional Transformation)
// 我们可以像操作数组一样操作 Result
let result: Result<User, NetworkError> = .success(User(name: "Alice"))

let welcomeMessageResult = result
    .map { user in "Hello, \(user.name)" } // 转换成功值
    .mapError { _ in UIError.displayMessage("出错了") } // 转换错误类型

// 只有在最后，我们才通过 switch 取出值
switch welcomeMessageResult {
case .success(let msg): print(msg)
case .failure(let error): print(error)
}
```

`[Image Diagram: throws vs Result]`
`[图解：左边是 throws，像一个分叉的铁路轨道，控制流跳转。右边是 Result，像一个密封的盒子，里面装着 Schrodinger's Cat (成功或失败的状态)，可以在函数间传递。]`

**两者如何转换？**
Swift 提供了完美的桥梁：

  * **Result 转 throws**: `try result.get()`
  * **throws 转 Result**: `Result { try doSomething() }`

## 3\. 可恢复错误模式（Recoverable Error Pattern）

这才是本文的重头戏。

通常我们处理错误只是简单地 `print(error)` 或弹个 Alert。但在工程化实践中，我们应该区分：

1.  **致命错误**（如代码逻辑 Bug）：Crash 或者是直接报错。
2.  **瞬态错误**（如网络超时）：可以自动重试。
3.  **用户可解决错误**（如未登录、磁盘满）：引导用户去解决。

我们可以利用 Swift 的 `Protocol` 来构建一个“可恢复”的错误系统。

### 实战：定义一个智能的错误协议

```swift
// 1. 定义用户行为
enum ErrorAction {
    case retry          // 重试
    case openSettings   // 打开设置
    case login          // 去登录
    case none           // 仅展示信息
}

// 2. 定义可恢复协议
protocol RecoverableError: LocalizedError {
    var action: ErrorAction { get }
    var userMessage: String { get }
}

// 3. 具体实现
enum NetworkError: RecoverableError {
    case noInternet
    case unauthorized
    case serverDown
    
    var errorDescription: String? { userMessage }
    
    var userMessage: String {
        switch self {
        case .noInternet: return "网络连接似乎断开了。"
        case .unauthorized: return "您的登录凭证已过期。"
        case .serverDown: return "服务器正在维护中。"
        }
    }
    
    var action: ErrorAction {
        switch self {
        case .noInternet, .serverDown: return .retry
        case .unauthorized: return .login
        }
    }
}
```

### 在 UI 层统一处理

有了上面的架构，我们的 UI 层代码就会变得异常简洁和统一。我们可以写一个全局的错误处理器：

```swift
class ErrorHandler {
    static func handle(_ error: Error, in viewController: UIViewController, retryBlock: (() -> Void)? = nil) {
        // 1. 检查是否是我们定义的“智能错误”
        guard let recoverable = error as? RecoverableError else {
            // 处理未知错误
            showAlert(message: error.localizedDescription, in: viewController)
            return
        }
        
        // 2. 根据 Action 智能决策
        let alert = UIAlertController(title: "提示", message: recoverable.userMessage, preferredStyle: .alert)
        
        switch recoverable.action {
        case .retry:
            alert.addAction(UIAlertAction(title: "重试", style: .default) { _ in
                retryBlock?()
            })
            alert.addAction(UIAlertAction(title: "取消", style: .cancel))
            
        case .openSettings:
            alert.addAction(UIAlertAction(title: "去设置", style: .default) { _ in
                // 打开系统设置 URL
            })
            
        case .login:
            alert.addAction(UIAlertAction(title: "重新登录", style: .destructive) { _ in
                // 跳转登录页
            })
            
        case .none:
            alert.addAction(UIAlertAction(title: "好的", style: .default))
        }
        
        viewController.present(alert, animated: true)
    }
}
```

**这样做的好处：**
业务逻辑层（ViewModel/Service）只需要抛出特定的 `NetworkError`，它不需要关心 UI 怎么展示。UI 层也不需要写死 `if error == .noInternet` 这种判断逻辑，一切都由多态和协议自动分发。

## 4\. Swift 6 的未来：Typed Throws

最后，不得不提一下 Swift 6 带来的革新。

以前我们纠结用 `Result` 还是 `throws`，很大原因是 `throws` 丢失了类型信息。但在 Swift 6 中，我们可以这样写：

```swift
// 明确告诉编译器：我只抛出 ConfigError
func loadConfig() throws(ConfigError) -> Config {
    // ...
}

do {
    try loadConfig()
} catch {
    // 这里的 error 被自动推断为 ConfigError 类型！
    // 不需要 switch error as? ConfigError
    switch error { 
    case .fileNotFound: ...
    case .decodingFailed: ...
    }
}
```

这让 `throws` 拥有了 `Result` 的类型安全性，同时保留了原生控制流的简洁性。这无疑是错误处理的终极形态。

## 总结

工程化的错误处理，不是为了写出不崩溃的代码，而是为了写出**即使出错也能优雅降级**的代码。

1.  **默认使用 `throws`**：特别是配合 Swift 6 的 Typed Throws，它最符合直觉。
2.  **在存储和跨边界时使用 `Result`**：当错误需要被当作数据传递时。
3.  **设计 `RecoverableError` 协议**：将错误的“展示逻辑”和“恢复逻辑”封装在错误类型内部，而不是散落在 UI 代码中。

希望这篇文章能帮你构建出更健壮的 Swift 应用。

-----

感谢阅读！你的项目中有一套统一的错误处理规范吗？还是处于“哪里报错修哪里”的状态？欢迎在评论区分享你的经验！