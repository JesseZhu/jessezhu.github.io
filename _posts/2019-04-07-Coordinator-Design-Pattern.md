---
layout: "post"
title:  "Coordinator Design Pattern in Swift"
date:  2019-04-07 13:15:43
categories: [杂项]
tags: [Swift]
---
协调器模式可以控制我们 APP 的流程，避免直接将页面导航跳转逻辑放入控制器中。它还可以帮我将视图控制器隔离，这在我们项目分层设计中非常有用。

我们将通过以下几个部分来介绍：

- 如何创建协调器
- 如何利用协调器控制流程
- 如何利用协调器在多个试图间传递数据

# 开始
首先我们创建一个 `Coordinator`  所有协调器将要遵循的协议，同时我们在创建一个 `TabBarContainerCoordinator` 协议：
```swift
import UIKit

protocol Coordinator {
  func start()
  func coordinate(to coordinator: Coordinator)
}

extension Coordinator {
  func coordinate(to coordinator: Coordinator) {
    coordinator.start()
  }
}

protocol TabBarContainerCoordinator: Coordinator {
    var rootViewController: UIViewController! { get }
}
```
再次， 我们创建一个 `AppCoordinator` 负责启动我们的 `App`，并将 `UINavigationController` 作为应用的根控制器:
```swift
class AppCoordinator: Coordinator {
  var children: [Coordinator] = []
	let window: UIWindow
	
	init(window: UIWindow) {
		self.window = window
	}
	
	func start() {
        showTabBarController()
  }
  
  private func showTabBarController() {
        children.removeAll()
        children = [
            HomeCoordinator(),
            ProfileCoordinator()
        ]
        
        let tabBarController = UITabBarController()
        tabBarController.viewControllers = children.compactMap({ $0 as? TabBarContainerCoordinator }).map({ $0.rootViewController })
        
        let navigationController = UINavigationController(rootViewController: tabBarController)
        window.rootViewController = navigationController
        window.makeKeyAndVisible()
    }
}
```
接着我们需要到 `AppDelegate` 中初始化 `AppCoordinator`:
```Swift
	import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    var coordinator: AppCoordinator?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        window = UIWindow()
        coordinator = AppCoordinator(window: window!)
        coordinator?.start()
        
        return true
    }
}
```
现在我们为我们的 `App` 创建第一个控制器。

## HomeCoordinator

和我们创建的 `AppCoordinator` 类似，我们创建一个 `HomeCoordinator` 类并遵循 `TabBarContainerCoordinator` 协议， 注意 `TabBarContainerCoordinator` 遵循 `Coordinator` 协议 包含一个计算属性 `rootViewController`。

```Swift
import UIKit

class HomeCoordinator: TabBarContainerCoordinator {
    var rootViewController: UIViewController! {
        return makeRootVC()
    }
    
    func start() {
        
    }
    
    private func makeRootVC() -> UIViewController {
        let homeVC = HomeVC()
        homeVC.tabBarItem = UITabBarItem(tabBarSystemItem: .history, tag: 0)
        homeVC.onRequestHomeDetail = { sender, detailId in
            let vc = HomeDetailVC()
            vc.detailId = detailId
            vc.closeAction = { sender in
                sender.navigationController?.popViewController(animated: true)
            }
            sender.show(vc, sender: nil)
        }
        return homeVC
    }
}
```

##HomeVC

在这里，我们定义一个闭包函数 `var onRequestProfile: ((HomeVC) -> Void)?` 并复写 `touchesEnded` 方法用于页面跳转入口。

```swift
import UIKit

class HomeVC: UIViewController {
    var onRequestHomeDetail: ((HomeVC, String) -> Void)?
    
    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .white
    }
    
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesEnded(touches, with: event)
        onRequestHomeDetail?(self, "detailId")
    }

}
```

## HomeDetailVC

包含一个 `detailId` 对象，用于从上一个页面 `HomeVC` 传值过来：

```Swift
import UIKit

class HomeDetailVC: UIViewController {
    var closeAction: ((HomeDetailVC) -> Void)?
    
    var detailId: String?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .yellow
    }
    
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesEnded(touches, with: event)
        closeAction?(self)
    }
}
```

以上就是整个 Coordinator 架构流程；