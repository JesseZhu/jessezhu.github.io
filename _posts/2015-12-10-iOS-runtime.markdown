---
title:  "iOS Runtime小集 "
date:   2015-12-10 18:22:03
categories: [杂项]
tags: [能工巧匠]
---
大家好，今天带来一些我对runtime的认识，希望能帮到大家。

> Runtime（运行时机制，是iOS开发人员迈向高阶的必学课程），今天我就在这篇文章中，简单介绍一些Runtime的使用方法，希望可以帮助大家更快速度的掌握Runtime。

### 一，简介
Runtime呢，简称也就是运行时（翻译过来也是运行时），是一套底层的C语言的API，在iOS开发中的核心组成部分。

说到Runtime是iOS开发的核心组成部分是有原因滴。

大家想想，Objective-C语言，本身就是一种动态语言，它把很多静态语言在编译时候干的事，都推迟到运行的时候才干。简单举个例子来说，在开发的时候，我们在.h中声明一个方法，我们并不在.m文件中实现这个方法，在编译阶段，这是没有问题的。但是如果程序运行起来，发现没有实现该方法，则会报异常，崩溃。这就是所谓的运行时。相比较C语言，因为C语言是一个静态语言，在编译的时候，如果某个方法只声明而不实现，往往在编译的时候直接报错了。

简单说呢，就是OC的函数，属于动态调用过程，在编译的时候并不能决定真正调用哪个函数，只有在真正运行的时候才会根据函数的名称找到对应的函数来调用。

这种动态语言的优势，就是写代码更加的灵活，比如我们可以把消息重新定向到别的对象，我们还可以动态添加一个方法，一个属性，替换方法等等。

接下来我就说一些Runtime的作用以及使用方法。
### 二，作用
* 1，消息转发
在OC语言的开发中，我们常常调用最多的便是方法。那么方法是怎么调用的呢？其实，方法的调用就是让对象发送消息。

怎么理解方法的调用就是让对象发送消息呢，这里我们就应该想到了OC的运行时机制。
比如我们调用一个 [p eat]，在编译的阶段，编译器并不知道eat需要执行哪段代码，这个时候[p eat]--->会转换成objc_msgSend(p,"eat"),这个字面意思，就是p这个对象，发一个eat的消息，以Selector的形式。
在运行阶段，执行到objc_msgSend这个函数的时候，函数内部会到p的对应的内存地址，寻找eat方法的参数，并执行。如果找不到，就报异常咯。

使用攻略：
在工程中，我们导入#import <objc/message.h>，然后在工程中输入objc_msgSend，如下

```sequence
id objc_msgSend(id self, SEL op, ...)
```
默认的情况是不会出现后方参数提示的，比如id self,SEL op。因为苹果并不喜欢我们使用它的底层，我们首先要做的是，开启提示。具体是到**Xcode**的**build setting**里面设置；
象方法的”消息机制“

```
    执行run方法
    [p run];
    [p performSelector:@selector(run)];
    objc_msgSend(p, @selector(run));
```

类方法的”消息机制

```
    执行run方法
    [Person run];
    [[Person class] performSelector:@selector(run)];
    objc_msgSend([Person class], @selector(run));
```
总结，类名调用类方法，本质是类名转换成类对象，去发送消息。

* 2，交换方法
利用底层的一些API，我们可以实现一些方法的交换，一般呢，我们都是跟系统的方法做交换的。比如交换数组的objectAtIndex:方法，来时实现即使数组越界，程序也不崩溃。比如交换UIImage的imageWithName方法，可以在图片为空的时候，打印出不存在的图片名称，等等。
下面我就实现下替换系统的UIImage的imageNamed的方法。
首先我们新建一个工程，创建一个UIImage的分类，在分类中我们扩冲如下代码:

```

+ (UIImage *)xz_imageName:(NSString *)imageName
{
    // 1.加载图片
    UIImage *image = [UIImage xz_imageName:imageName];

    // 2.判断功能
    if (image == nil) {
        NSLog(@"%@图片为空",imageName);
    }

    return image;
}
```
之后我们在分类加载的时候，替换系统的方法。代码如下：

```

+ (UIImage *)xz_imageName:(NSString *)imageName
{
    // 1.加载图片
    UIImage *image = [UIImage xz_imageName:imageName];

    // 2.判断功能
    if (image == nil) {
        NSLog(@"%@图片为空",imageName);
    }

    return image;
}
```
经过上面方法的实现，我们在调用imageNamed的时候，便会替换成我们的方法了。

* 3，动态添加方法
动态添加方法是一个很有意义的事情，因为程序在编译的时候，会把所有的方法加到一个方法列表中，但是我们并不是所有的方法都会使用到，耗时耗力。我们应该多利用懒加载的方式，用到的方法，在添加，不用的方法，用到的时候在添加。
我们先创建一个Person类，.h文件中声明一个eat的方法，.m中我们并不实现这个方法，往常一执行这个eat:的方法(随便传个参数)，程序一定是报异常，这里我们利用runtime，在程序发现没有实现这个方法的时候拦截它，让他执行相应的操作。
我们需要在Person的.m文件中，导入#import <objc/message.h>，然后写下下面2个方法：

```

// 当某个类方法只声明，没有实现的时候，会执行下面的方法
+ (BOOL)resolveClassMethod:(SEL)sel;
// 当某个对象方法没有只声明，没有实现的时候，会执行下面的方法。
+ (BOOL)resolveInstanceMethod:(SEL)sel ;
```
我们先创建一个函数：

```

// 我们还需要定义一个函数
void eat(id self, SEL _cmd,id param1){  
    NSLog(@"调用%@---%@---%@",self,NSStringFromSelector(_cmd),param1);
}
```
讲解一下，每一个函数，都有2个默认的隐式参数，一个是谁调用了自己，一个是SEL，SEL就是对方法的一种包装。包装的SEL类型数据它对应相应的方法地址,找到方法地址就可以调用方法。后面的id类型的param1是我写的一个参数，因为是C语言的函数，我们无法创建NS之类的类型，这里我就用id类型来接参数。

接下来，根据官方文档我们可以添加下面的代码做判断，使得在找不到eat方法的时候，可以执行我们动态添加的eat方法，注意，上面的函数名可以随意写，只需要在下面添加方法的时候做好关联就好：

```

// 外界调用一个没有实现的对象方法-
// resolveInstanceMethod中sel是没有实现的参数
+ (BOOL)resolveInstanceMethod:(SEL)sel{

    NSLog(@"%@",NSStringFromSelector(sel));
//    if (sel == @selector(eat)) {}这句话等同下面的判断

    if ([NSStringFromSelector(sel) isEqualToString:@"eat:"] ) {
        // 这里添加方法
        // 给哪个类
        //SEL:方法名
        //IMP:方法的实现（函数的入口-函数的指针-函数的名）
        //type :方法类型
        class_addMethod(self, sel, (IMP)eat, "v@:@");  
        return YES;
    }
    return [super resolveInstanceMethod:sel];
}
```
这里我着重说下OBJC_EXPORT BOOL class_addMethod(Class cls, SEL name, IMP imp,  const char *types)这个函数的参数意义。

```

Class cls:就是你给哪个类添加的这个方法
SEL name：就是方法名字是啥，默认进入方法的时候，肯定是方法上带的参数sel没有，所以我们这里传入的是sel。
(IMP)eat：这里需要我们传入一个IMP，啥实IMP,IMP就是方法的实现（函数的入口-函数的指针-函数的名）大家这里意会下
 const char *types，这里我们可以好好说一说。我先说下意思，*v@:@*的意思就是，返回类型是void,参数是id,SEL,id。具体大家参考上面我写的函数以及函数说明。
```

* 4，动态添加属性
通过运行时添加属性，作用面还是比较广的。比如想给button绑定一个模型，大家肯定会继承button来操作，其实通过运行时添加属性，我们就可以实现给系统button添加一个模型的需求。
这里我们不讲这个，我们讲讲分类中如果添加属性。
默认我们在创建分类的时候，添加一个成员属性，大家往往会发现，直接调用这个类的点语法，我们获取不了属性,为什么呢？
因为默认分类创建的属性，不会执行set和get方法。如果我们一定要获取到这个属性，我们应该怎么做呢？这里有2种方法，一种就是添加一个静态变量，重写它的set和get方法.
另外一种就是通过运行时，添加这个属性。代码如下：

```

// 声明一个char型的key
static char nameKey;

- (void)setName:(NSString *)name
{
    // 属性跟对象有关联-就是添加属性

    // object:对象
    // key:属性名，根据key去获取到值
    // value:值
    // policy：策略
    objc_setAssociatedObject(self, &nameKey, name, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}
```
这里我们讲解一下OBJC_EXPORT void objc_setAssociatedObject(id object, const void *key, id value, objc_AssociationPolicy policy)这个方法。
这个方法的字面意思就是把一个值，通过一个key绑定到一个类中，最后设置一下保存的策略。代码的意思是，把name的值，通过nameKey绑定到当前类，保存的是nonatomic的copy类型。

补充一下最后一个参数（策略）：

```

// assign类型
   OBJC_ASSOCIATION_ASSIGN = 0,       
// 非原子性Retain-->相当于Strong
    OBJC_ASSOCIATION_RETAIN_NONATOMIC = 1,
// 非原子性 copy-
    OBJC_ASSOCIATION_COPY_NONATOMIC = 3,   
// 原子性Retain                                          
    OBJC_ASSOCIATION_RETAIN = 01401,     
// 原子性copy                                                                          
    OBJC_ASSOCIATION_COPY
```
取得动态绑定属性的方法如下:

```

- (NSString *)name
{
    return objc_getAssociatedObject(self, &nameKey);
}
```

简单的解释就是通过self这个类的，nameKey这个key,我们就可以取到nameKey相对应的值了。
通过上面的做法，我们就实现了分类中扩充尚需经的功能了。
